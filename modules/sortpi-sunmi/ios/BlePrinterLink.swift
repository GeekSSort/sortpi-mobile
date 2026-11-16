import CoreBluetooth
import Foundation

struct FoundPrinter {
  let id: UUID
  let name: String
  let isPrinter: Bool
}

/// One short-lived Bluetooth Low Energy connection to a receipt printer. Everything runs on one private queue; the async methods
/// below park a continuation, start the Bluetooth work, and the delegate callbacks resume it.
final class BlePrinterLink: NSObject, CBCentralManagerDelegate, CBPeripheralDelegate, @unchecked Sendable {
  private let queue = DispatchQueue(label: "com.sortpi.ble-printer")
  private var central: CBCentralManager!
  private var peripheral: CBPeripheral?
  private var writer: CBCharacteristic?
  private var writeWithResponse = false
  private var discovered: [UUID: (peripheral: CBPeripheral, info: FoundPrinter)] = [:]

  private var stateWaiter: CheckedContinuation<Void, Error>?
  private var scanWaiter: CheckedContinuation<[FoundPrinter], Never>?
  private var locateWaiter: CheckedContinuation<CBPeripheral?, Never>?
  private var scanTarget: UUID?
  private var connectWaiter: CheckedContinuation<Void, Error>?
  private var discoverWaiter: CheckedContinuation<Void, Error>?
  private var pendingServices = 0
  private var readyWaiter: CheckedContinuation<Void, Never>?
  private var responseWaiter: CheckedContinuation<Void, Error>?

  override init() {
    super.init()
    central = CBCentralManager(delegate: self, queue: queue)
  }

  // MARK: Bluetooth on, and allowed

  func ensurePoweredOn() async throws {
    try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
      queue.async {
        switch self.central.state {
        case .poweredOn: cont.resume()
        case .unauthorized: cont.resume(throwing: BluetoothPermissionException())
        case .unsupported: cont.resume(throwing: BluetoothUnavailableException())
        case .poweredOff: cont.resume(throwing: BluetoothOffException())
        default:
          // The first use shows the system permission question; wait for the answer.
          self.stateWaiter = cont
          self.queue.asyncAfter(deadline: .now() + 20) { [weak self] in
            guard let self, let waiter = self.stateWaiter else { return }
            self.stateWaiter = nil
            waiter.resume(throwing: BluetoothPermissionException())
          }
        }
      }
    }
  }

  func centralManagerDidUpdateState(_ central: CBCentralManager) {
    guard let waiter = stateWaiter else { return }
    switch central.state {
    case .poweredOn: stateWaiter = nil; waiter.resume()
    case .unauthorized: stateWaiter = nil; waiter.resume(throwing: BluetoothPermissionException())
    case .unsupported: stateWaiter = nil; waiter.resume(throwing: BluetoothUnavailableException())
    case .poweredOff: stateWaiter = nil; waiter.resume(throwing: BluetoothOffException())
    default: break
    }
  }

  // MARK: Finding printers

  func scan(seconds: Double) async -> [FoundPrinter] {
    NSLog("[SortPiBLE] scan start, %d seconds", Int(seconds)) // TEMPORARY
    return await withCheckedContinuation { (cont: CheckedContinuation<[FoundPrinter], Never>) in
      queue.async {
        self.scanTarget = nil
        self.scanWaiter = cont
        self.central.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: true])
        self.queue.asyncAfter(deadline: .now() + seconds) { self.finishScan() }
      }
    }
  }

  private func finishScan() {
    guard let waiter = scanWaiter else { return }
    scanWaiter = nil
    central.stopScan()
    waiter.resume(returning: discovered.values.map { $0.info })
  }

  private func locate(_ id: UUID) async -> CBPeripheral? {
    // A printer this phone has met before can be fetched at once. Otherwise scan for it.
    let known: CBPeripheral? = await withCheckedContinuation { (cont: CheckedContinuation<CBPeripheral?, Never>) in
      queue.async { cont.resume(returning: self.central.retrievePeripherals(withIdentifiers: [id]).first) }
    }
    if let known { NSLog("[SortPiBLE] locate: printer already known to this phone"); return known }
    NSLog("[SortPiBLE] locate: scanning for the saved printer")
    return await withCheckedContinuation { (cont: CheckedContinuation<CBPeripheral?, Never>) in
      queue.async {
        self.scanTarget = id
        self.locateWaiter = cont
        self.central.scanForPeripherals(withServices: nil, options: [CBCentralManagerScanOptionAllowDuplicatesKey: true])
        self.queue.asyncAfter(deadline: .now() + 8) { self.finishLocate() }
      }
    }
  }

  private func finishLocate() {
    guard let waiter = locateWaiter else { return }
    locateWaiter = nil
    central.stopScan()
    let found = scanTarget.flatMap { discovered[$0]?.peripheral }
    NSLog("[SortPiBLE] locate finished: %@", found == nil ? "NOT FOUND" : "found")
    scanTarget = nil
    waiter.resume(returning: found)
  }

  func centralManager(_ central: CBCentralManager, didDiscover p: CBPeripheral, advertisementData: [String: Any], rssi RSSI: NSNumber) {
    let heard = ((advertisementData[CBAdvertisementDataLocalNameKey] as? String) ?? p.name ?? "").trimmingCharacters(in: .whitespaces)
    let services = (advertisementData[CBAdvertisementDataServiceUUIDsKey] as? [CBUUID]) ?? []
    let printerServices = ["18F0", "FEE7", "E7810A71-73AE-499D-8C15-FAA9AEF0C3F2", "49535343-FE7D-4AE5-8FA9-9FAFD205E455"].map { CBUUID(string: $0) }
    let before = discovered[p.identifier]?.info
    let name = heard.isEmpty ? (before?.name ?? "") : heard
    let isPrinter = (before?.isPrinter ?? false) || name.localizedCaseInsensitiveContains("printer") || services.contains { printerServices.contains($0) }
    NSLog("[SortPiBLE] heard name='%@' services=%@ rssi=%@", heard, services.map { $0.uuidString }.joined(separator: ","), RSSI) // TEMPORARY
    // A device with no name and no printer service is of no use to a shopkeeper.
    guard !name.isEmpty || isPrinter else { return }
    let shown = name.isEmpty ? "Bluetooth printer \(p.identifier.uuidString.suffix(4))" : name
    discovered[p.identifier] = (p, FoundPrinter(id: p.identifier, name: shown, isPrinter: isPrinter))
    if let target = scanTarget, target == p.identifier { finishLocate() }
  }

  // MARK: Connecting

  func connect(id: UUID) async throws {
    guard let p = await locate(id) else { throw BluetoothConnectException() }
    peripheral = p
    try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
      queue.async {
        p.delegate = self
        self.connectWaiter = cont
        self.central.connect(p, options: nil)
        self.queue.asyncAfter(deadline: .now() + 10) { [weak self] in
          guard let self, let waiter = self.connectWaiter else { return }
          self.connectWaiter = nil
          self.central.cancelPeripheralConnection(p)
          waiter.resume(throwing: BluetoothConnectException())
        }
      }
    }
    try await findWriter(p)
  }

  func disconnect() {
    queue.async {
      if let p = self.peripheral { self.central.cancelPeripheralConnection(p) }
    }
  }

  func centralManager(_ central: CBCentralManager, didConnect p: CBPeripheral) {
    NSLog("[SortPiBLE] connected")
    guard let waiter = connectWaiter else { return }
    connectWaiter = nil
    waiter.resume()
  }

  func centralManager(_ central: CBCentralManager, didFailToConnect p: CBPeripheral, error: Error?) {
    NSLog("[SortPiBLE] connect FAILED: %@", error?.localizedDescription ?? "no detail")
    guard let waiter = connectWaiter else { return }
    connectWaiter = nil
    waiter.resume(throwing: BluetoothConnectException())
  }

  // MARK: Finding the channel that takes print data

  private func findWriter(_ p: CBPeripheral) async throws {
    try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
      queue.async {
        self.discoverWaiter = cont
        p.discoverServices(nil)
        self.queue.asyncAfter(deadline: .now() + 10) { [weak self] in self?.failDiscovery() }
      }
    }
  }

  private func failDiscovery() {
    NSLog("[SortPiBLE] channel discovery FAILED or timed out")
    guard let waiter = discoverWaiter else { return }
    discoverWaiter = nil
    waiter.resume(throwing: BluetoothConnectException())
  }

  func peripheral(_ p: CBPeripheral, didDiscoverServices error: Error?) {
    guard error == nil, let services = p.services, !services.isEmpty else { return failDiscovery() }
    pendingServices = services.count
    for service in services { p.discoverCharacteristics(nil, for: service) }
  }

  func peripheral(_ p: CBPeripheral, didDiscoverCharacteristicsFor service: CBService, error: Error?) {
    pendingServices -= 1
    guard pendingServices <= 0, let waiter = discoverWaiter else { return }
    discoverWaiter = nil
    if let characteristic = chooseWriter(p) {
      NSLog("[SortPiBLE] writer: %@ (service %@) props=%lu", characteristic.uuid.uuidString, characteristic.service?.uuid.uuidString ?? "?", characteristic.properties.rawValue)
      writer = characteristic
      writeWithResponse = !characteristic.properties.contains(.writeWithoutResponse)
      waiter.resume()
    } else {
      NSLog("[SortPiBLE] no writable channel found")
      waiter.resume(throwing: BluetoothConnectException())
    }
  }

  /// The well-known print channels of common receipt printers first, then any channel that accepts writes.
  private func chooseWriter(_ p: CBPeripheral) -> CBCharacteristic? {
    func writable(_ c: CBCharacteristic) -> Bool { c.properties.contains(.writeWithoutResponse) || c.properties.contains(.write) }
    let preferred = [
      ("18F0", "2AF1"),
      ("E7810A71-73AE-499D-8C15-FAA9AEF0C3F2", "BEF8D6C9-9C21-4C9E-B632-BD58C1009F9F"),
      ("49535343-FE7D-4AE5-8FA9-9FAFD205E455", "49535343-8841-43F4-A8D4-ECBE34729BB3"),
      ("FF00", "FF02"),
    ]
    for (serviceId, characteristicId) in preferred {
      let service = p.services?.first { $0.uuid == CBUUID(string: serviceId) }
      if let c = service?.characteristics?.first(where: { $0.uuid == CBUUID(string: characteristicId) }), writable(c) { return c }
    }
    let all = (p.services ?? []).flatMap { $0.characteristics ?? [] }
    return all.first { $0.properties.contains(.writeWithoutResponse) } ?? all.first(where: writable)
  }

  // MARK: Sending

  func send(_ data: Data) async throws {
    guard let p = peripheral, let characteristic = writer else { throw BluetoothConnectException() }
    // Stay under the largest piece the printer accepts; cheap printers cope better with small ones.
    let largest = p.maximumWriteValueLength(for: writeWithResponse ? .withResponse : .withoutResponse)
    let chunk = max(20, min(largest, 180))
    NSLog("[SortPiBLE] send %d bytes, chunk %d, withResponse=%d", data.count, chunk, writeWithResponse ? 1 : 0)
    var offset = 0
    while offset < data.count {
      let end = min(offset + chunk, data.count)
      let piece = data.subdata(in: offset..<end)
      if writeWithResponse {
        try await withCheckedThrowingContinuation { (cont: CheckedContinuation<Void, Error>) in
          queue.async {
            self.responseWaiter = cont
            p.writeValue(piece, for: characteristic, type: .withResponse)
          }
        }
      } else {
        await waitUntilReady(p)
        queue.sync { p.writeValue(piece, for: characteristic, type: .withoutResponse) }
      }
      offset = end
    }
  }

  private func waitUntilReady(_ p: CBPeripheral) async {
    await withCheckedContinuation { (cont: CheckedContinuation<Void, Never>) in
      queue.async {
        if p.canSendWriteWithoutResponse { cont.resume(); return }
        self.readyWaiter = cont
        self.queue.asyncAfter(deadline: .now() + 3) { [weak self] in
          guard let self, let waiter = self.readyWaiter else { return }
          self.readyWaiter = nil
          waiter.resume()
        }
      }
    }
  }

  func peripheralIsReady(toSendWriteWithoutResponse peripheral: CBPeripheral) {
    guard let waiter = readyWaiter else { return }
    readyWaiter = nil
    waiter.resume()
  }

  func peripheral(_ p: CBPeripheral, didWriteValueFor characteristic: CBCharacteristic, error: Error?) {
    guard let waiter = responseWaiter else { return }
    responseWaiter = nil
    if let error { waiter.resume(throwing: error) } else { waiter.resume() }
  }
}
