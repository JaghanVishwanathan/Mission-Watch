# Updating Live Mission Control for a launch

Every stream link for `/live` is in one JSON file:

**[`frontend/missionwatch-web/public/config/live-missions.json`](../frontend/missionwatch-web/public/config/live-missions.json)**

No TypeScript or rebuild knowledge is needed. VS Code reads the linked schema (`live-missions.schema.json`), so it autocompletes field names and underlines mistakes as you type.

## Before a launch

1. **YouTube broadcasters** (`"platform": "youtube"`): paste the livestream into `video`. Any of these works:
   - `https://www.youtube.com/watch?v=qYXjwonSquQ`, `https://youtu.be/…`, `https://www.youtube.com/live/…`, `https://www.youtube.com/embed/…`
   - the bare 11-character video ID, e.g. `qYXjwonSquQ`
   - YouTube's whole `<iframe …>` embed code (escape the inner quotes as `\"`, or just paste the URL instead)
2. **SpaceX on X** (`"platform": "x"`): paste the broadcast link `https://x.com/i/broadcasts/…` into `broadcastUrl`. Without a broadcast, put a post link (`https://x.com/SpaceX/status/…`) in `postUrl` and it is embedded instead.
3. **Which launch** (optional): the page follows the next upcoming launch from `launch.nextFromProvider` (`"SpaceX"`). To pin a specific launch, put its Launch Library 2 ID (the id in `/launches/<id>` on this site) into `launch.ll2LaunchId`.

To swap a broadcaster, edit `broadcaster`, `channelUrl` and `id` (any short unique key). To show two launches, add a second object to `missions`; a mission selector appears.

Empty values are fine: the panel shows *Unavailable* with a button that opens the broadcaster's channel.

## Check and publish

```bash
cd frontend/missionwatch-web
npm test -- --watch=false   # "public/config/live-missions.json is valid" must pass
```

Commit and push (or open a PR into `main`). The Pages workflow redeploys, and visitors get the new links on their next visit to `/live`: the file is fetched past the cache.

If the deployed file still has a mistake, `/live` keeps working: it lists the problem in a warning box and uses the valid parts. If the file is missing or unreadable, it follows SpaceX's next launch without streams.
