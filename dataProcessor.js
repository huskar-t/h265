import Decoder from "./decoder";


self.decode = new Decoder()

self.onmessage = function (event) {
    let data = event.data
    let type = data.type
    switch (type) {
        case 'loadwasm':
            self.decode.loadWASM(event)
            break
        case 'in':
            self.decode.dataIn(data)
            break
        case 'close':
            self.decode.close()
            break
    }
}
console.log(self)