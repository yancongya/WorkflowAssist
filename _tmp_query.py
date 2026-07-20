import sqlite3, json

db = sqlite3.connect('C:/Users/Administrator/.local/share/mimocode/mimocode.db')
db.row_factory = sqlite3.Row
cur = db.cursor()

# Get all sessions for this project, ordered by time
cur.execute("SELECT id, project_id, title, time_created FROM session WHERE project_id='eab0eb0f-faa3-4f30-ab13-b755926cf4ef' ORDER BY time_created ASC")
sessions = [dict(r) for r in cur.fetchall()]

for s in sessions:
    print(f"\n{'='*60}")
    print(f"SESSION: {s['id']}")
    print(f"TITLE: {s['title'][:100]}")
    print(f"TIME: {s['time_created']}")
    print(f"{'='*60}")
    
    # Get messages for this session
    cur.execute("SELECT id, agent_id, data FROM message WHERE session_id=? ORDER BY time_created ASC", (s['id'],))
    messages = [dict(r) for r in cur.fetchall()]
    
    for m in messages:
        data = json.loads(m['data'])
        role = data.get('role', '?')
        agent_id = m.get('agent_id', '')
        
        if role == 'user':
            # Get text parts
            cur.execute("SELECT data FROM part WHERE message_id=? ORDER BY time_created ASC", (m['id'],))
            parts = [dict(r) for r in cur.fetchall()]
            for p in parts:
                pd = json.loads(p['data'])
                if pd.get('type') == 'text':
                    text = pd.get('text', '')[:200]
                    print(f"\n  [USER]: {text}")
        elif role == 'assistant':
            # Get parts (tool calls, text)
            cur.execute("SELECT data FROM part WHERE message_id=? ORDER BY time_created ASC", (m['id'],))
            parts = [dict(r) for r in cur.fetchall()]
            for p in parts:
                pd = json.loads(p['data'])
                ptype = pd.get('type', '?')
                if ptype == 'text':
                    text = pd.get('text', '')[:300]
                    if text.strip():
                        print(f"\n  [ASSISTANT text]: {text[:200]}")
                elif ptype == 'tool':
                    tool = pd.get('tool', '?')
                    state = pd.get('state', {})
                    inp = str(state.get('input', ''))[:150]
                    out = str(state.get('output', ''))[:200]
                    print(f"\n  [TOOL: {tool}] input={inp}")
                    print(f"    output={out[:150]}")

db.close()
