"""Runs a model (optionally with a LoRA adapter) over out/eval.jsonl and writes out/<name>.jsonl.
   python tools/ask/run_mlx.py --model Qwen/Qwen3-0.6B [--adapter path] --name tuned06
"""
import argparse, json, os, time
from mlx_lm import load, generate

ap = argparse.ArgumentParser()
ap.add_argument('--model', required=True)
ap.add_argument('--adapter')
ap.add_argument('--name', required=True)
a = ap.parse_args()
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'out')
model, tok = load(a.model, adapter_path=a.adapter)
rows = [json.loads(l) for l in open(os.path.join(out, 'eval.jsonl'))]
t0 = time.time()
with open(os.path.join(out, f'{a.name}.jsonl'), 'w') as f:
    for r in rows:
        msgs = [{'role': 'system', 'content': r['system']}, {'role': 'user', 'content': r['q']}]
        prompt = tok.apply_chat_template(msgs, add_generation_prompt=True, enable_thinking=False, tokenize=False)
        text = generate(model, tok, prompt=prompt, max_tokens=80, verbose=False)
        f.write(json.dumps({'set': r['set'], 'q': r['q'], 'text': text}, ensure_ascii=False) + '\n')
print(f'{len(rows)} answers in {time.time() - t0:.0f}s -> {a.name}.jsonl')
