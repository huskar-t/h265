import yuvCanvas from 'yuv-canvas'
import yuvBuffer from 'yuv-buffer'
import BaseClass from "./base/BaseClass";
import EventsConfig from "./config/EventsConfig";
import DataProcessorController from "./dataProcessorController";

export class Video extends BaseClass {
    constructor(canvas, url, wsUrl, worker = 2,cacheCount = 10) {
        super()
        console.log(canvas, url, wsUrl)
        if (!url) {
            alert("视频地址错误")
            return
        }
        this.options.worker = worker
        this.cacheCount = cacheCount
        this.url = url
        this.wsUrl = wsUrl || window.location.host
        this.started = false
        this.workerIndex = 0
        this.tps = 0
        this.latestPts = -Infinity
        this.frameCache = new Map()
        this.setCanvas(canvas)
        this.setRender()
        this.bindEvent()
        this.processorController = new DataProcessorController(this.options)
        this.processorController.init()
    }

    bindEvent() {
        this.events.on(EventsConfig.DataProcessorReady, () => {
            this.startWS()
        })
        this.events.on(EventsConfig.DecodeDecoded, (data) => {
            this.drawFrame(data)
        })
    }

    setCanvas(canvas) {
        this.canvas = document.getElementById(canvas)
    }

    setRender(canvas) {
        this.render = yuvCanvas.attach(canvas || this.canvas, null)
    }

    clear() {
        this.render.clear()
    }

    // 更新帧
    drawFrame(data) {
        if (data.pts < this.latestPts) {
            console.log("drop frame")
            return
        }
        this.frameCache.set(data.pts, data)
        if (this.frameCache.size <= this.cacheCount) {
            return;
        }
        let min = -Infinity
        let frame = null
        this.frameCache.forEach((v, k, m) => {
            if (min === -Infinity) {
                min = k
                frame = v
            }
            if (k < min) {
                min = k
                frame = v
            }
        })
        this.frameCache.delete(min)
        let {buf_y, buf_u, buf_v, width, height, stride_y, stride_u, stride_v, pts} = frame

        this.latestPts = pts
        let y, u, v, format, frameDisplay
        let width_y = width
        let height_y = height
        let width_u = width_y / 2
        let height_u = height_y / 2
        y = {
            bytes: buf_y,
            stride: stride_y
        }
        u = {
            bytes: buf_u,
            stride: stride_u
        }
        v = {
            bytes: buf_v,
            stride: stride_v
        }

        format = yuvBuffer.format({
            width: width_y,
            height: height_y,
            chromaWidth: width_u,
            chromaHeight: height_u
        })
        frameDisplay = yuvBuffer.frame(format, y, u, v)
        this.render.drawFrame(frameDisplay)
    }

    startWS() {
        if (this.started) {
            return
        }
        this.started = true
        let that = this
        this.ws = new WebSocket(this.wsUrl)
        this.ws.onopen = function () {
            console.log("Connection open ...")
            that.ws.send(that.url);
        };
        this.ws.onmessage = function (evt) {
            that.tps += 1
            let nType = evt.data.charCodeAt(0)
            if (nType === 32) {
                that.workerIndex += 1
                that.workerIndex %= that.options.worker
            }
            that.events.emit(EventsConfig.DateIn, {
                data: evt.data,
                index: that.workerIndex,
                pts : that.tps
            })
        };

        this.ws.onclose = function () {
            that.events.emit(EventsConfig.DateClose)
            console.log("Connection closed.")
        };

        this.ws.onerror = function () {
            that.events.emit(EventsConfig.DateClose)
            that.ws.close()
            console.log("Connection closed.")
        }
    }
}

export default Video