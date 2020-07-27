export default class Decoder {
    constructor() {
    }

    loadWASM(event) {
        let libPath = event.data.libPath
        self.Module = {
            locateFile: function (wasm) {
                return libPath + wasm;
            }
        }
        self.importScripts(libPath + 'libffmpeg.js')
        self.Module.onRuntimeInitialized = function () {
            console.log('wasm loaded')
            self.decode.openDecoder()
            self.decode.onWasmLoaded()
        }
    }

    openDecoder() {
        let that = this
        let videoCallback = self.Module.addFunction(function (addr_y, addr_u, addr_v, stride_y, stride_u, stride_v, width, height, pts) {
            let out_y = HEAPU8.subarray(addr_y, addr_y + stride_y * height)
            let out_u = HEAPU8.subarray(addr_u, addr_u + (stride_u * height) / 2)
            let out_v = HEAPU8.subarray(addr_v, addr_v + (stride_v * height) / 2)
            let obj = {
                stride_y,
                stride_u,
                stride_v,
                width,
                height,
                buf_y: new Uint8Array(out_y),
                buf_u: new Uint8Array(out_u),
                buf_v: new Uint8Array(out_v),
                pts
            }
            that.onDecoded(obj);
        });

        // let ret = Module._openDecoder(decoder_type, videoCallback, 2)
        let ret = self.Module._openDecoder(1, videoCallback, 2)
        if (ret === 0) {
            console.log("openDecoder success");
        } else {
            console.error("openDecoder failed with error", ret);
        }
    }
    dataIn(data){
        // let b = JSON.parse(data.slice(1));
        // let payload = b["payload"];
        // let pts = b["pts"];
        let pts = data.pts;
        let typedArray = this.stringToUint8Array(data.data.slice(1))
        let size = typedArray.length

        let cacheBuffer = self.Module._malloc(size);
        self.Module.HEAPU8.set(typedArray, cacheBuffer);
        self.Module._decodeData(cacheBuffer, size, pts);
        if (cacheBuffer != null) {
            self.Module._free(cacheBuffer);
            cacheBuffer = null;
        }
    }
    close(){
        self.Module._flushDecoder();
        self.Module._closeDecoder();
    }
    stringToUint8Array(str) {
        let deStr = atob(str)
        let arr = [];
        for (let i = 0, j = deStr.length; i < j; ++i) {
            arr.push(deStr.charCodeAt(i));
        }
        return new Uint8Array(arr);
    }

    onWasmLoaded() {
        self.postMessage({
            type: 'dataProcessorReady'
        })
    }
    onDecoded(data){
        self.postMessage({
            type: 'decoded',
            data: data
        })
    }
}