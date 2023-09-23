
import fs from "fs";


type Token = {
    name: string;
    value?: string;
}

type TokenInfo = {
    object: number;
    array: number;
    quote: number;
}





class StreamParser {
    private tokenInfo: TokenInfo = {
        object: 0,
        array: 0,
        quote: 0,
    };
    private prevType: string = "";

    parse(chunk: string): any[] {
        const { tokens, hm: updatedHm, prevType: updatedPrevType } = jsonLexerLine(chunk, this.prevType, this.tokenInfo);
        Object.assign(this.tokenInfo, updatedHm);
        this.prevType = updatedPrevType;
        
        return parseTokens(tokens);  // parse the tokens generated from the chunk
    }

    getInfo(): TokenInfo {
        return { ...this.tokenInfo };
    }
}

function jsonLexerLine(line: string, prevType: string, hm: TokenInfo): { tokens: Token[], hm: TokenInfo, prevType: string } {
    const tokens: Token[] = [];
    let buffer = "";
    let resChar: Token = { name: "" };

    for (const char of line) {

            if (['[', '{', '"', '}', ']'].includes(char)) {

                if (buffer.length) {
                    resChar = {
                        "name": prevType,
                        "value": buffer,
                    };
                    tokens.push(resChar);
                    buffer = "";
                }

                if (char === "{") {
                    hm["object"] = hm["object"] +1;

                    resChar = {
                        "name": "OPEN_OBJECT",
                    }
                } else if (char === "}") {
                    hm["object"] = hm["object"] -1;

                    resChar = {
                        "name": "CLOSE_OBJECT",
                    }
                } else if (char === "[") {
                    hm["array"] = hm["array"] +1;

                    resChar = {
                        "name": "OPEN_ARRAY",
                    }
                } else if (char === "]") {
                    hm["array"] = hm["array"] -1;

                    resChar = {
                        "name": "CLOSE_ARRAY",
                    }
                } else if (char === '"') {
                    hm["quote"] = hm["quote"] + 1;

                    // resChar = {
                    //     "name": hm["quote"] % 2 === 0 ? "CLOSE_QUOTE" : "OPEN_QUOTE",
                    // }

                    // if 1 or 3, then open quote
                    // if 2 or 4, then close quote

                    // if 1 Open quote for key
                    // if 2 Close quote for key
                    // if 3 Open quote for value
                    // if 4 Close quote for value

                    let quoteMod = hm["quote"] % 4;
                    let quoteNmae = ""

                    if (quoteMod === 1) {
                        quoteNmae = "OPEN_KEY";
                        prevType = "KEY";

                    } else if (quoteMod === 2) {
                        quoteNmae = "CLOSE_KEY";
                    } else if (quoteMod === 3) {
                        quoteNmae = "OPEN_VALUE";
                        prevType = "VALUE";

                    } else if (quoteMod === 0) {
                        quoteNmae = "CLOSE_VALUE";
                        hm["quote"] = hm["quote"] - 4;
                    }

                    resChar = {
                        "name": quoteNmae,
                    }
                } 
                // Appends to the tokens
                tokens.push(resChar);
            } else {
                buffer += char;
            }
            
        }

    if (buffer.length) {
        resChar = {
            "name": prevType,
            "value": buffer,
        };
        tokens.push(resChar);
    }

    return { tokens, hm, prevType };
}

function parseTokens(tokens: Token[]) {

    let keyBuffer = "";
    let valueBuffer = "";

    let inKey = false;
    let inValue = false;

    let objIdx = 0;

    let results: any[] = []

    tokens.forEach((token) => {

        let res: any = {};

        if (token["name"] === "OPEN_KEY") {
            inKey = true;
        } else if (token["name"] === "CLOSE_KEY") {
            inKey = false;
        } else if (token["name"] === "OPEN_VALUE") {
            inValue = true;
        } else if (token["name"] === "CLOSE_VALUE") {
            inValue = false;

            res = {
                "index": objIdx,
                "key": keyBuffer,
                "value": valueBuffer,
            }

            results.push(res);
            keyBuffer = "";
            valueBuffer = "";

        } else if (token["name"] === "OPEN_OBJECT") {
            objIdx += 1;
        }

        if (inKey && token["name"] === "KEY") {
            keyBuffer += token["value"];
        } else if (inValue && token["name"] === "VALUE") {
            valueBuffer += token["value"];

            res = {
                "index": objIdx,
                "key": keyBuffer,
                "value": valueBuffer,
                "delta": token["value"],
            }

            results.push(res);
        }

    });
    return results;
}





console.log("Stream parser")

const filename = "./output_postcode_partial.txt";
const lines = fs.readFileSync(filename, "utf8").split("\n");

const parser = new StreamParser();


lines.forEach((chunk) => {
    const res = parser.parse(chunk);
    if (res.length) {
        console.log(res);
    }
    // Do something with the results
})

const info = parser.getInfo();
console.log(info);