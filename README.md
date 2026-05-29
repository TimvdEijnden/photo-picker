# photo picker

Review and select photos in the browser to quickly make a curated selection of photos.
Let's say you have a folder with 1000 photos and you want to pick only the ones of specific people then you can use this tool to quickly go through the photos and copy the keepers to a new folder.

- Launched from the command line. 
- Works in the browser.
- Specify the source and destination folders.
- Press space to copy keepers to an output folder.

Starts a web server at default port 3000 and opens your default browser.

### usage

```bash
npx photo-picker <source-dir> <dest-dir> [port]
```

### controls

| key | action |
|---|---|
| `←` | previous photo |
| `→` | next photo |
| `space` | copy to dest and advance |
