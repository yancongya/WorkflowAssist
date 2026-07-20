import sqlite3, json

db = sqlite3.connect('C:/Users/Administrator/.local/share/mimocode/mimocode.db')
db.row_factory = sqlite3.Row
cur = db.cursor()

# Get detailed parts from the main session
session_id = 'ses_095a8edcfffeYU4saMgxC7PeEt'
cur.execute("SELECT id, data FROM part WHERE session_id=? ORDER BY time_created ASC", (session_id,))
parts = [dict(r) for r in cur.fetchall()]

print(f"=== PARTS for session {session_id} ===")
for p in parts:
    pd = json.loads(p['data'])
    ptype = pd.get('type', '?')
    if ptype == 'text':
        text = pd.get('text', '')
        print(f"\n[TEXT] ({len(text)} chars):")
        print(text[:1000])
    elif ptype == 'tool':
        tool = pd.get('tool', '?')
        state = pd.get('state', {})
        inp = state.get('input', {})
        out = state.get('output', '')
        print(f"\n[TOOL: {tool}]")
        print(f"  input: {json.dumps(inp, ensure_ascii=False)[:300]}")
        print(f"  output: {str(out)[:500]}")

# Also check notes.md from this session
print("\n\n=== NOTES.MD for session ===")
try:
    with open('C:/Users/Administrator/.local/share/mimocode/memory/sessions/ses_095a8edcfffeYU4saMgxC7PeEt/notes.md', 'r', encoding='utf-8') as f:
        print(f.read())
except:
    print("No notes.md found")

# Check if there are older sessions in other projects that reference this codebase
print("\n\n=== ALL SESSIONS (all projects) ===")
cur.execute("SELECT id, project_id, title, time_created FROM session ORDER BY time_created DESC LIMIT 30")
all_sessions = [dict(r) for r in cur.fetchall()]
for s in all_sessions:
    print(f"  {s['id']}: project={s['project_id'][:12]}... title={s['title'][:80]} time={s['time_created']}")

db.close()
