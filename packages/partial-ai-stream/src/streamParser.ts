import { StreamMode } from "./utils.js";
import { JsonCloser } from "./jsonCloser.js";
import { Status, StreamResponseWrapper, ErrorResponse } from "./utils.js";


export class StreamParser {

    private jsonCloser: JsonCloser;
    private mode: StreamMode;
    private entityIndex: number = 0;

    constructor(mode: StreamMode = StreamMode.StreamObject) {
        this.mode = mode;
        this.jsonCloser = new JsonCloser(mode);
    }
    
    // Write to the buffer
    // Return a value if the parsing is possible
    // if not return empty or null
    // Output only if there was a change
    // Return based on the mode
    parse(chunk: string): StreamResponseWrapper | null {

        let index = this.entityIndex;
        let completed = false;
        let outputEntity: any = null;
        let end = chunk.indexOf("}");
        let error = null;

        this.jsonCloser.append(chunk);

        const [hasChanged, resJson] = this.jsonCloser.parse();

        if (end !== -1) {
            this.entityIndex += 1;
            completed = true;
        }

        if (hasChanged && resJson) {
            outputEntity = resJson;
        } else {
            outputEntity = null;
        }

        if (completed === false && (
            this.mode === StreamMode.StreamObject ||
            this.mode === StreamMode.NoStream
            )
        ) {
            return null;
        }


        if (outputEntity) {   
            const streamRes: StreamResponseWrapper = {
                index: index,
                status: completed ? Status.COMPLETED : Status.PARTIAL,
                data: outputEntity,
            }
            return streamRes;
        } else if (error) {
            const streamRes: StreamResponseWrapper = {
                index: index,
                status: Status.FAILED,
                data: error,
            }
            return streamRes;
        }
        return null;
    }
}