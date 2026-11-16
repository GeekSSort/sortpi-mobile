Pod::Spec.new do |s|
  s.name           = 'SortPiSunmi'
  s.version        = '1.0.0'
  s.summary        = 'SortPi native helpers (Bluetooth receipt printing on iOS)'
  s.description    = 'Prints receipts to a Bluetooth Low Energy thermal printer with CoreBluetooth.'
  s.license        = 'MIT'
  s.author         = 'GeekSSort'
  s.homepage       = 'https://github.com/GeekSSort/sortpi-mobile'
  s.platforms      = { :ios => '16.4' }
  s.source         = { git: 'https://github.com/GeekSSort/sortpi-mobile.git' }
  s.static_framework = true
  s.swift_version  = '5.9'

  s.dependency 'ExpoModulesCore'

  s.source_files = '**/*.{h,m,swift}'
  s.pod_target_xcconfig = { 'DEFINES_MODULE' => 'YES' }
end
