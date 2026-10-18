#!/usr/bin/env python3
"""Build the standalone HTML and update only the native host's HTML resource.

No compiler or Python packages are required. The original host is unsigned; its
code, WebView2 libraries and resource allocation remain byte-for-byte intact.
"""
from pathlib import Path
import base64
import gzip
import hashlib
import re
import struct

ROOT = Path(__file__).resolve().parents[1]
SOURCE_SHA256 = "3ebd2e9cb38b835527140aee26c6760e9df6fad9ec30a8d173732bbeaf4ab1e7"


def pe_checksum(data, checksum_offset):
    total = 0
    for offset in range(0, len(data), 2):
        if checksum_offset <= offset < checksum_offset + 4:
            continue
        word = int.from_bytes(data[offset:offset + 2], "little")
        total += word
        total = (total & 0xFFFF) + (total >> 16)
    total = (total & 0xFFFF) + (total >> 16)
    return total + len(data)


def main():
    original = (ROOT / "src/original.html").read_text()
    styles = (ROOT / "ui/studio.css").read_text()
    presentation = (ROOT / "ui/studio.js").read_text()
    # The native system font keeps this work tool fully usable without Internet.
    html = re.sub(r"@import url\('https://fonts.googleapis.com/[^']+'\);", "", original)
    html = html.replace("</head>", "<style id=\"minimal-studio-styles\">\n" + styles + "\n</style></head>", 1)
    html = html.replace("</body>", "<script id=\"minimal-studio-ui\">\n" + presentation + "\n</script></body>", 1)
    favicon = '<link rel="icon" href="data:image/svg+xml,%3Csvg xmlns=%27http://www.w3.org/2000/svg%27 viewBox=%270 0 32 32%27%3E%3Crect width=%2732%27 height=%2732%27 rx=%276%27 fill=%27%23293e33%27/%3E%3Cpath d=%27m16 5 10 6v11l-10 6-10-6V11Zm0 0v11m-10-5 10 5 10-5M16 16v12%27 fill=%27none%27 stroke=%27%23fff%27 stroke-width=%271.5%27/%3E%3C/svg%3E">'
    html = html.replace("</head>", favicon + "</head>", 1)
    (ROOT / "index.html").write_text(html)
    output_dir = ROOT / "dist"
    output_dir.mkdir(exist_ok=True)
    (output_dir / "Cubo-Studio-Minimal.html").write_text(html)

    original_exe = (ROOT / "src/Cubo-Studio-1.14.exe").read_bytes()
    if hashlib.sha256(original_exe).hexdigest() != SOURCE_SHA256:
        raise SystemExit("The original executable differs from the inspected 1.14 file.")
    pe_offset = struct.unpack_from("<I", original_exe, 0x3C)[0]
    optional_header = pe_offset + 24
    magic = struct.unpack_from("<H", original_exe, optional_header)[0]
    directory_offset = optional_header + (112 if magic == 0x20B else 96)
    if struct.unpack_from("<II", original_exe, directory_offset + 8 * 4) != (0, 0):
        raise SystemExit("Refusing to modify an Authenticode-signed executable.")
    resource_offset = original_exe.index(b'<!doctype html>')
    resource_size = struct.unpack_from("<I", original_exe, resource_offset - 4)[0]
    if resource_size != 266730:
        raise SystemExit("Unexpected native HTML resource allocation.")
    compressed = base64.b64encode(gzip.compress(html.encode(), mtime=0)).decode()
    wrapper = ('<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Cubo Studio</title></head><body><p>Abriendo Cubo Studio…</p><script>(async()=>{try{const b=Uint8Array.from(atob("'
               + compressed
               + '"),c=>c.charCodeAt(0));const html=await new Response(new Blob([b]).stream().pipeThrough(new DecompressionStream("gzip"))).text();document.open();document.write(html);document.close();}catch(e){document.body.textContent="No se pudo abrir Cubo Studio: "+e.message;}})();</script></body></html>').encode()
    if len(wrapper) > resource_size:
        raise SystemExit(f"HTML exceeds the reserved resource: {len(wrapper)} > {resource_size}.")
    result = bytearray(original_exe)
    result[resource_offset:resource_offset + resource_size] = wrapper.ljust(resource_size, b" ")
    checksum_offset = optional_header + 64
    struct.pack_into("<I", result, checksum_offset, pe_checksum(result, checksum_offset))
    exe_path = output_dir / "Cubo-Studio-Minimal.exe"
    exe_path.write_bytes(result)
    # Verify the embedded application and the boundaries of the native modification.
    embedded = bytes(result[resource_offset:resource_offset + resource_size])
    payload = re.search(rb'atob\("([A-Za-z0-9+/=]+)"\)', embedded)[1]
    assert gzip.decompress(base64.b64decode(payload)) == html.encode()
    for start, end in [(0, checksum_offset), (checksum_offset + 4, resource_offset), (resource_offset + resource_size, len(result))]:
        assert result[start:end] == original_exe[start:end]
    print(f"HTML: {len(html.encode()):,} bytes; native resource: {len(wrapper):,}/{resource_size:,} bytes")
    print(f"Windows executable: {exe_path.name} ({len(result):,} bytes)")
    print(f"SHA256: {hashlib.sha256(result).hexdigest()}")


if __name__ == "__main__":
    main()
