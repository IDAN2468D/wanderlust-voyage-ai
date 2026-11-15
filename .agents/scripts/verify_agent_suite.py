#!/usr/bin/env python3
import json
import os

required = [
    'AGENTS.md', 'PRD.md', 'SPEC.md', 'PLAN.md',
    'PROMPT_COPYABLE.md', 'agents.json',
    'Skills/travel-orchestrator-agent/SKILL.md',
    'Skills/flight-search-engine/SKILL.md',
    'Skills/places-curation-hotel/SKILL.md',
    'Skills/budget-currency-optimizer/SKILL.md',
    'Skills/weather-packing-optimizer/SKILL.md',
    'Skills/safety-health-advisor/SKILL.md',
    'Skills/culture-events-specialist/SKILL.md',
    'Skills/liquid-glass-travel-ui/SKILL.md',
    'Skills/google-flow-travel-mcp/SKILL.md',
    'Skills/tlv-holiday-flight-board/SKILL.md',
    'state/task.md', 'state/SPRINTS.md', 'state/ARCHITECTURE_STATE.md'
]
base = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
missing = [f for f in required if not os.path.exists(os.path.join(base, f))]
if missing:
    print('Missing files:', missing)
    exit(1)
with open(os.path.join(base, 'agents.json'), 'r', encoding='utf-8') as fp:
    data = json.load(fp)
print(f"All agent suite files verified ({len(data.get('agents', []))} agents registered).")

