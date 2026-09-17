# Flight Log

Turn your flight history into a personal travel map you can replay and keep

[繁體中文](README.md) · [Import guide](docs/GMAIL-IMPORT.md) · [Deploy](docs/SELF-HOST.md)

![Five years of fictional travel with 120 flights across 20 countries and regions](docs/media/world-map.png)

![A recording of the moving aircraft and following camera](docs/media/journey.gif)

Replay completed flights with a camera that follows the aircraft. Choose 1×, 2× or 3×, tap the route to search your history, or hide the compact glass controls. Browse a separate flight list and export a travel passport as an image

The screenshots use fictional journeys. Routes estimate airport connections using great circles; they are not recorded flight tracks

## Run locally

Use Node 24. Clone the repository and run these commands. For a ZIP download, enter the extracted folder and start at `nvm use`:

```sh
git clone https://github.com/Hugo6991/flight-log.git
cd flight-log
nvm use
npm ci
npm run setup:local
npm start
```

Open http://127.0.0.1:4173 to explore 120 fictional flights across 20 countries and regions, covering six continents. Taipei and Shanghai are the main bases. The fixed period runs from 17 September 2021 through 16 September 2026, with 24 flights per rolling year and six per quarter

Airline sources support the flight numbers and routes only. Travel dates and flown status are invented, so the sample does not establish historical operations or anyone’s travel history. Departure and arrival times are blank. See the [itinerary and source ledger](data/example/README.md)

Choose `匯入自己的紀錄` to replace the entire sample with your JSON backup, or `清空示範` to remove the fictional rows. Clearing preserves any personal rows and stays cleared after a reload. The menu action `復原上次還原` restores the snapshot saved before the latest import or clear

Existing browser records take precedence, including a deliberately empty history. A nonempty remote source is used next; an empty source displays the sample. Read errors remain visible. The journey player is at `/journey/`, and exported passport images retain the fictional data label

The first setup creates an empty local database and never reads your email. The public repository contains the sample only; keep personal histories in your own browser or a separate private installation

## Add your history

1. Connect your own Gmail account in an AI assistant that supports it, or export selected booking emails yourself
2. Use the prompt in [Gmail import](docs/GMAIL-IMPORT.md) to extract flight segments and flag duplicates, changes and cancellations
3. Validate the JSON with `npm run import:prepare -- data/local/flights.reviewed.json`, review uncertain segments, then restore it in the website
4. Follow [self hosting](docs/SELF-HOST.md) to create your Cloudflare Worker and D1 database

There is no built in Google sign in, inbox integration or background sync. The Gmail workflow currently depends on a separate assistant and your authorization. It cannot recover deleted emails or flights booked through another person's account

## Data and limits

Edits stay in your browser. Export a JSON backup before switching devices or clearing browser storage. A deployed D1 seed is publicly readable; you may instead keep the remote source empty and restore your history only in your own browser. There are no user accounts or automatic device sync

The map requires WebGL and a network connection. OpenFreeMap and NASA GIBS provide map data without an app API key. Their terms and availability are separate from this project's license

This is a personal travel history tool, not live flight tracking, an airline booking service, or an official Flighty product

## Development

```sh
npm run check
npm test
npm run build
```

See [CONTRIBUTING](CONTRIBUTING.md), [SECURITY](SECURITY.md), and [third party notices](THIRD_PARTY_NOTICES.md). Use synthetic data in issues, screenshots and tests

See the [demo verification report](docs/DEMO-VERIFICATION.md) for data checks and browser results, including mobile screenshots

MIT License covers the original code and synthetic sample data. Personal travel records and airline source pages are excluded, as are map services and third party brands
