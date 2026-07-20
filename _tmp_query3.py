import sqlite3, json

db = sqlite3.connect('C:/Users/Administrator/.local/share/mimocode/mimocode.db')
db.row_factory = sqlite3.Row
cur = db.cursor()

# Check for user statements containing rule/decision keywords across ALL sessions for this project
session_ids = [
    'ses_095a8edcfffeYU4saMgxC7PeEt',
    'ses_095a8eda2ffeTSff6CixkSJBhB',
    'ses_095a8c7cbffe9e8KqD5F60y3Yx'
]

for sid in session_ids:
    cur.execute("SELECT id, agent_id, data FROM message WHERE session_id=? AND json_extract(data, '$.role')='user' ORDER BY time_created ASC", (sid,))
    users = [dict(r) for r in cur.fetchall()]
    for u in users:
        data = json.loads(u['data'])
        cur2 = db.cursor()
        cur2.execute("SELECT data FROM part WHERE message_id=? ORDER BY time_created ASC", (u['id'],))
        parts = [dict(r) for r in cur2.fetchall()]
        for p in parts:
            pd = json.loads(p['data'])
            if pd.get('type') == 'text':
                text = pd.get('text', '')
                if any(kw in text.lower() for kw in ['always', 'never', 'remember', 'rule', 'decision', 'decided', 'prefer', 'must', 'should', '不要', '必须', '记住', '规则', '决定']):
                    print(f"SESSION {sid}:")
                    print(f"  USER: {text[:300]}")
                    print()

# Also check the other project for context
cur.execute("SELECT id, project_id, title, time_created FROM session WHERE project_id='7a4e1e19-d45d-488e-99cd-0935c5786ff2' AND json_extract(data, '$.role') IS NULL ORDER BY time_created DESC LIMIT 5")
other_sessions = [dict(r) for r in cur.fetchall()]

# Get non-checkpoint-writer sessions from the other project
cur.execute("SELECT id, title, time_created FROM session WHERE project_id='7a4e1e19-d45d-488e-99cd-0935c5786ff2' AND title NOT LIKE '%checkpoint-writer%' ORDER BY time_created DESC LIMIT 10")
other_real = [dict(r) for r in cur.fetchall()]
print("=== Other project real sessions ===")
for s in other_real:
    print(f"  {s['id']}: {s['title'][:80]} time={s['time_created']}")

db.close()
