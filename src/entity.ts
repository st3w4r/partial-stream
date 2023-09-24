import { z } from "zod";
import { zodToTs, printNode } from "zod-to-ts";

import { StreamResponseWrapper } from "./utils.js";


export class Entity {

    // The name of the entity
    private name: string; 
    // Zod schema
    private schema: z.ZodTypeAny;

    constructor(name: string, schema: z.ZodTypeAny) {
        this.name = name;
        this.schema = schema;
    }

    generatePromptSchema() {
        const { node } = zodToTs(this.schema, this.name);
        const nodeString = printNode(node);
        
        const prompt = `
        Format an array of json object to respect this json TypeScript definition:
        ${nodeString}
    
        Output as a json array:
        example: [{"name": "value"}, {"name": "value"}]
    
        Now convert to the JSON format, write directly to JSON. No explanation needed.
        `;
        return prompt;
    }


    parse(entityObject: any): any {
        const parserRes = this.schema.safeParse(entityObject);
        return parserRes.success ? parserRes.data : null;
    }

    async *genParse(entityObject: AsyncGenerator<StreamResponseWrapper | null, void, unknown>): any {
        for await (const item of entityObject) {
            if (item) {
                item.data = this.parse(item.data);
                item.entity = this.name;
            }
            yield item;
        }
    }

    async *genParseArray(entityObject: AsyncGenerator<StreamResponseWrapper | null, void, unknown>): any {
        for await (const item of entityObject) {
            if (item) {
                let childrens = item.data[this.name];
                console.log(item.data);
                if (childrens !== undefined && childrens.length > 0) {
                    let index = childrens.length - 1
                    let latest = childrens[index];
                    // Set the entity, override the index and data generated by the parser
                    item.entity = this.name;
                    item.index = index;
                    console.log("LATEST:",latest);
                    item.data = this.parse(latest);
                    yield item;
                }
            }
        }
    }

}
