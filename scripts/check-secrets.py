#!/usr/bin/env python3
"""Check tracked source for high-confidence secrets without printing their contents."""
from pathlib import Path
import re, subprocess, sys
patterns = [
    re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
    re.compile(rb'gh[pousr]_[A-Za-z0-9]{30,}'),
    re.compile(rb'github_pat_[A-Za-z0-9_]{40,}'),
    re.compile(rb'AIza[0-9A-Za-z_-]{35}'),
    re.compile(rb'"type"\s*:\s*"service_account"'),
    re.compile(rb'ya29\.[0-9A-Za-z_-]{30,}'),
]
files = subprocess.check_output(['git', 'ls-files', '-z']).split(b'\0')
bad=[]
for raw in files:
    if not raw: continue
    p=Path(raw.decode())
    if not p.is_file(): continue
    if p.name.startswith('.env') and p.name != '.env.example': bad.append(str(p)); continue
    data=p.read_bytes()
    if any(pattern.search(data) for pattern in patterns): bad.append(str(p))
if bad:
    print('Potential secrets in: '+', '.join(sorted(set(bad))))
    sys.exit(1)
print(f'No high-confidence secret patterns in {sum(bool(x) for x in files)} tracked files. This does not replace human review.')
