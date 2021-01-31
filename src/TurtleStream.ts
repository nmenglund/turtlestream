import Stream from 'stream';

interface Options {
  /**
   * The interval between each chunk, in milliseconds.
   */
  interval: number;

  /**
   * The size of each chunk, in bytes.
   */
  chunkSize: number;
}

export default class TurtleStream extends Stream {
  private options: Options;

  private ended = false;
  private closed = false;

  // Where the cursor is in the queue[0] chunk
  private chunk_offset = 0;

  // Queue; a simple array of each chunk written to the stream
  private queue: any[] = [];

  // Reference to the timeout function
  private ticker: null | NodeJS.Timeout = null;

  private previousTimestamp: [number, number] = process.hrtime();

  constructor(options?: Partial<Options>) {
    super();
    this.options = {
      interval: options?.interval ?? 100,
      chunkSize: options?.chunkSize ?? 10,
    };
  }

  write(data: any) {
    this.queue.push(data);
    this.flush();
    return this.queue.length === 0;
  }

  end() {
    this.ended = true;
    this.flush();
  }

  tick() {
    this.ticker = null;
    this.flush();
  }

  flush() {
    var diff = process.hrtime(this.previousTimestamp);
    var diff_in_ms = diff[0] * 1e3 + diff[1] / 1e6;
    var time_gap = diff_in_ms - this.options.interval;
    if (this.queue.length) {
      // Emit data only when enough time has passed
      if (time_gap >= 0) {
        var bytes_remaining_in_this_chunk = this.options.chunkSize;
        if (
          bytes_remaining_in_this_chunk + this.chunk_offset >=
          this.queue[0].length
        ) {
          // If there is not enough data in the current chunk to fill
          // a chunkSize, just emit what's left in the current chunk.
          this.emit('data', this.queue[0].slice(this.chunk_offset));
          this.queue.shift();
          this.chunk_offset = 0;
        } else {
          // If there is enough data, grab a chunkSize and move the cursor
          this.emit(
            'data',
            this.queue[0].slice(
              this.chunk_offset,
              this.chunk_offset + bytes_remaining_in_this_chunk
            )
          );
          this.chunk_offset += bytes_remaining_in_this_chunk;
        }
        this.previousTimestamp = process.hrtime();
      }
      // If no ticker is running, set it for the next interval
      if (!this.ticker) {
        this.ticker = setTimeout(
          this.tick.bind(this),
          time_gap < 0 ? -time_gap : this.options.interval
        );
      }
    } else {
      // No data left in the queue
      if (this.ended) {
        if (!this.closed) {
          this.closed = true;
          this.emit('end');
          this.emit('close');
        }
      } else {
        // Nothing left in queue!
        this.emit('drain');
      }
    }
  }
}
