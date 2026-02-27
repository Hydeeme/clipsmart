import ytdl from 'ytdl-core';

export class VideoProcessor {
  async download(url: string) {
    return ytdl(url);
  }
}