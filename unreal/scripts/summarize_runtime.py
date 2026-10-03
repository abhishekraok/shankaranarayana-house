"""Validate an isolated native CSV capture and summarize its final 1000 frames."""
import csv
import configparser
import json
import math
import statistics
import sys
from datetime import datetime, timezone
from pathlib import Path

root = Path(sys.argv[1])
process = json.loads((root / 'process.json').read_text(encoding='utf-8-sig'))
assert process['exit_code'] == 0 and not process['timed_out'], 'Abnormal process exit'
files = list((root / 'Saved/Profiling/CSV').glob('*.csv'))
assert len(files) == 1, 'Expected one isolated CSV capture'
started = datetime.fromisoformat(process['started_utc'].replace('Z', '+00:00'))
assert datetime.fromtimestamp(files[0].stat().st_mtime, timezone.utc) >= started, 'Stale CSV'
csv.field_size_limit(20_000_000)
with files[0].open(encoding='utf-8-sig', newline='') as stream:
    rows = list(csv.reader(stream))
header, frames, end_header, metadata_row = rows[0], rows[1:-2], rows[-2], rows[-1]
assert len(frames) == process['capture_frames'], 'Incomplete frame capture'
assert end_header[:len(header)] == header, 'CSV column positions changed'
# UE adds late stats as extra columns and repeats the final header. The initial
# prefix remains stable; unequal row widths must not silently discard frames.
# UE can leave commas in command-line metadata unescaped. Read only the unique
# fixed labels we need instead of assuming the entire tail is key/value pairs.
metadata = {}
for label in ('[HasHeaderRowAtEnd]', '[systemresolution.resx]', '[systemresolution.resy]',
              '[targetframerate]', '[vsyncenabled]'):
    matches = [index for index, cell in enumerate(metadata_row) if cell == label]
    assert len(matches) == 1 and matches[0] + 1 < len(metadata_row), label
    metadata[label] = metadata_row[matches[0] + 1]
assert metadata['[HasHeaderRowAtEnd]'] == '1'
columns = ('FrameTime', 'GameThreadTime', 'RenderThreadTime', 'RHIThreadTime', 'GPUTime')
values = {}
for name in columns:
    index = header.index(name)
    numbers = [float(row[index]) for row in frames]
    assert all(math.isfinite(value) and value >= 0 for value in numbers), name
    values[name] = numbers
count = min(1000, len(frames))
tail = {name: numbers[-count:] for name, numbers in values.items()}
assert all(value > 0 for value in tail['FrameTime'] + tail['GPUTime']), 'Missing steady timing samples'
settings = configparser.ConfigParser()
settings.optionxform = str
settings_file = root / 'Saved/Config/Windows/GameUserSettings.ini'
assert settings.read(settings_file, encoding='utf-8-sig') and settings.has_section('ScalabilityGroups')
scalability = {key: float(value) for key, value in settings['ScalabilityGroups'].items()}
assert scalability and all(math.isfinite(value) for value in scalability.values())


def percentile(numbers, fraction):
    ordered = sorted(numbers)
    position = (len(ordered) - 1) * fraction
    lower = int(position)
    upper = min(lower + 1, len(ordered) - 1)
    return ordered[lower] + (ordered[upper] - ordered[lower]) * (position - lower)


report = {
    'passed': True, 'csv': str(files[0]), 'frames': len(frames), 'tail_frames': count,
    'resolution': [int(metadata['[systemresolution.resx]']), int(metadata['[systemresolution.resy]'])],
    'target_framerate': float(metadata['[targetframerate]']),
    'vsync': metadata['[vsyncenabled]'],
    'settings_file': str(settings_file), 'saved_scalability': scalability,
    'tail_milliseconds': {name: {'median': statistics.median(numbers), 'p95': percentile(numbers, .95),
                                'p99': percentile(numbers, .99), 'maximum': max(numbers)}
                          for name, numbers in tail.items()},
    'tail_frames_over_33_333_ms': sum(value > 1000 / 30 for value in tail['FrameTime']),
    'all_frames_over_33_333_ms': sum(value > 1000 / 30 for value in values['FrameTime']),
    'limits': 'Isolated default tour, with initialized game settings and startup transients. '
              'Tail sample covers one route segment; no uncapped or before/after performance claim.',
}
(root / 'summary.json').write_text(json.dumps(report, indent=2), encoding='utf-8')
print(json.dumps(report))
