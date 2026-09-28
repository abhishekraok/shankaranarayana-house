"""Audit lighting in a fresh Unreal process, after Blueprint reconstruction."""
import json
from pathlib import Path
import sys
import unreal
sys.path.insert(0, str(Path(__file__).resolve().parent))
import lighting

unreal.get_editor_subsystem(unreal.LevelEditorSubsystem).load_level('/Game/Maps/Site')
actors = unreal.get_editor_subsystem(unreal.EditorActorSubsystem)
skies = lighting.audit_sky(actors)
volumes = [a for a in actors.get_all_level_actors() if isinstance(a, unreal.PostProcessVolume)]
assert len(volumes) == 1 and volumes[0].unbound, 'Exactly one global exposure volume required'
values = {}
for key, expected in lighting.POST_PROCESS.items():
    settings = volumes[0].settings
    assert settings.get_editor_property('override_' + key), key
    actual = settings.get_editor_property(key)
    assert abs(actual - expected) < 1e-5 if isinstance(expected, float) else actual == expected, (key, actual, expected)
    values[key] = actual if isinstance(actual, (float, int)) else str(actual)
report = {'passed': True, 'skylights': skies, 'post_process': values}
(Path(unreal.Paths.project_saved_dir()) / 'lighting-audit.json').write_text(json.dumps(report, indent=2))
print('LIGHTING_AUDIT_PASSED: native HDR sky and exposure survive reload')
