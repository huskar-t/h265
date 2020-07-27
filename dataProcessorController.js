import webworkify from 'webworkify-webpack'
import EventsConfig from './config/EventsConfig'
import BaseClass from "./base/BaseClass";

export default class DataProcessorController extends BaseClass {
    constructor(options) {
        super(options);
        this.libPath = window.location.origin + "/lib/"
        this.processors = []
    }

    init() {
        this.initWorkers()
        this.bindEvent()
        this.loadjs()
    }

    bindEvent() {
        this.events.on(EventsConfig.DateIn, (data) => {
            this.processors[data.index].postMessage({
                type: 'in',
                data: data.data,
                pts: data.pts
            })
        })
        this.events.on(EventsConfig.DateClose, () => {
            for (let i = 0; i < this.processors; i++) {
                this.processors[i].postMessage({
                    type: 'close',
                })
            }
        })

    }

    initWorkers() {
        // 创建worker
        for (let i = 0; i < this.options.worker; i++) {
            let processor = webworkify(require.resolve('./dataProcessor.js'))
            processor.id = i
            processor.onmessage = (event) => {
                let workerData = event.data
                let type = workerData.type
                let data = workerData.data
                switch (type) {
                    case 'dataProcessorReady':
                        this.onDataProcessorReady()
                        break
                    case 'decoded':
                        this.onDecoded(data)
                        break
                }
            }
            this.processors.push(processor)
        }
    }

    loadjs() {
        for (let i = 0; i < this.processors.length; i++) {
            this.processors[i].postMessage({
                type: 'loadwasm',
                libPath: this.libPath
            })
        }
    }

    onDecoded(data) {
        this.events.emit(EventsConfig.DecodeDecoded, data)
    }

    onDataProcessorReady() {
        this.events.emit(EventsConfig.DataProcessorReady)
    }
}