import hashlib
import json
import os
import tempfile
from datetime import datetime, timezone
from pathlib import Path

CONFIG = Path(__file__).parent / "config"


def now():
    return datetime.now(timezone.utc).isoformat()


def digest(data):
    return hashlib.sha256(data).hexdigest()


def read_json(path):
    return json.loads(Path(path).read_text(encoding="utf-8"))


def write_json(path, value):
    atomic_write(path, (json.dumps(value, ensure_ascii=False, indent=2, allow_nan=False) + "\n").encode())


def atomic_write(path, data):
    path = Path(path)
    path.parent.mkdir(parents=True, exist_ok=True)
    fd, temporary = tempfile.mkstemp(dir=path.parent, prefix=".writing-")
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(data)
        os.replace(temporary, path)
    finally:
        if os.path.exists(temporary):
            os.unlink(temporary)


def write_jsonl(path, records):
    atomic_write(path, "".join(json.dumps(r, ensure_ascii=False, allow_nan=False) + "\n" for r in records).encode())


def read_jsonl(path):
    return [json.loads(line) for line in Path(path).read_text(encoding="utf-8").splitlines() if line]


def issue(code, severity="error", **context):
    return dict(code=code, severity=severity, **context)


def checked_path(root, relative):
    root = Path(root).resolve()
    path = (root / relative).resolve()
    if not path.is_relative_to(root):
        raise ValueError("Path escapes data directory")
    return path
