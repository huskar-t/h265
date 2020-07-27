# rtsp h256 流 web 软解播放
## 本项目地址
[https://github.com/huskar-t/h265](https://github.com/huskar-t/h265 "h265")
## 修改自项目
[https://github.com/goldvideo/h265player](https://github.com/goldvideo/h265player "h265player")
## 介绍
主流摄像头都支持rtsp协议推流,h264视频流可以通过 webrtc 解码后喂给 h5 的 video 标签进行播放  
h265 视频流在web端无法进行解码播放,如果在服务器端进行解码后将图片信息推给前端除了会给后端带来巨大的cpu压力同时会导致传输信息巨大产生延迟  
本项目目的是在 web 端软解 h265 视频流并播放
一般web端使用视频展示无音频需求所以可以免去音频解码和音视频对齐

## 构思
通过搜索相关文章以及开源项目最终决定:后端取到 h265 裸流进行处理之后 websocket 实时推送web端, web 端通过 ffmpeg 使用 webassembly + worker 在浏览器端软解最终使用 canvas 展现实时监控

## 实现细节
> * h265软解非常消耗cpu如果单线程进行软解如果解析速度不够要么丢包要么产生延迟(i5-8500 单线程软解 低码率720p 都会产生巨大延迟),此时需要 webworker 进行多线程解析  
> * webworker 为异步处理所以要保证两个关键帧之间的所有帧都在同一个worker里面处理,解决办法为后端推送数据时将naluType一起推送,当naluType为32时换到新worker处理
> * worker 处理速度不一致会使帧乱序输出,此时引入队列来缓存一定数量的帧,新帧按顺序插入,效果不是很明显而且会导致延迟
> * worker 个数要根据码率和分辨率以及cpu性能进行调整,4个worker 6K码率720P视频流主板温度直接起飞然后保护断电

## 使用
dist/h265.html  
``` js
let video = new Video.Video("playCanvas", url, "ws://127.0.0.1:32000/ws",10,0)
```
第一个参数为 canvas 的 id  
第二个参数为rtsp地址这个地址会在 websocket 建立连接之后发给后端  
第三个参数为 websocket 地址  
第四个参数为 webworker 数量  
第五个参数为 缓存队列长度

## websocket内容规定
每个包为二进制流内容为 nalutype + nalu 
```js
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
```
当客户端连接上时会发送 rtsp的地址给后端
```js
        this.ws.onopen = function () {
            console.log("Connection open ...")
            that.ws.send(that.url);
        };
```

## 具体实践
摄像头码率不好设置，海康直接设置成低码率 经测试低码率 1080P 流 5个worker 无队列基本不丢帧 cpu 占用 10%~20% (i5-8500)

## 后记
后端程序员被迫写前端只能写写简单的html界面,非不务正业项目,配合后端取流已实现web端播放实时h265监控