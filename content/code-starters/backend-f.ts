import type {StarterMap} from './types';

// 后端题 be-x2-15（Cache Aside 读取）、be-x3-15（按长度分帧读取）的作答框架。
export const backendStartersF:StarterMap={
'be-x2-15':{
python:String.raw`import json
import logging
import random
import redis

class NotFound(Exception):
    pass

def get_user(rdb: redis.Redis, user_id: str) -> dict:
    key = "user:" + user_id
    try:
        s = rdb.get(key)  # 未命中时返回 None
        # TODO 1：命中时：值是空串（b""）说明数据库里也没有，抛出 NotFound；否则解析 JSON 返回
        ...
    except redis.RedisError as err:
        # TODO 2：缓存故障时记一条日志，然后往下走，降级查库
        ...

    user = db.find_user(user_id)  # 查不到返回 None
    # TODO 3：数据库也查不到时，缓存一个空值（TTL 短，比如 60 秒）防止穿透，再抛出 NotFound
    ...
    # TODO 4：回填缓存：TTL = 10 分钟 + 随机抖动，避免大量 key 同时过期
    ...
    return user`,
go:String.raw`func GetUser(ctx context.Context, id string) (*User, error) {
    key := "user:" + id
    s, err := rdb.Get(ctx, key).Result()
    // TODO 1：命中（err == nil）时：值是空串说明数据库里也没有，返回 ErrNotFound；否则解析 JSON 返回
    // TODO 2：err 不是 redis.Nil（不是“未命中”而是缓存故障）时，记日志后降级查库
    ...
    u, err := db.FindUser(ctx, id)
    // TODO 3：数据库也查不到时，缓存一个空值（TTL 短，比如 1 分钟）防止穿透，再返回 ErrNotFound
    ...
    if err != nil {
        return nil, err
    }
    // TODO 4：回填缓存：TTL = 10 分钟 + 随机抖动，避免大量 key 同时过期
    ...
    return u, nil
}`,
java:String.raw`// 使用 Jedis 和 Jackson；查不到时返回 Optional.empty()
static Optional<User> getUser(String id) throws Exception {
    String key = "user:" + id;
    try {
        String s = jedis.get(key); // 未命中时返回 null
        // TODO 1：命中时：值是空串说明数据库里也没有，返回 Optional.empty()；否则解析 JSON 返回
        ...
    } catch (JedisException e) {
        // TODO 2：缓存故障时记一条日志，然后往下走，降级查库
        ...
    }
    Optional<User> u = db.findUser(id);
    // TODO 3：数据库也查不到时，缓存一个空值（TTL 短，比如 60 秒）防止穿透
    ...
    // TODO 4：回填缓存：TTL = 10 分钟 + 随机抖动，避免大量 key 同时过期
    ...
    return u;
}`,
ts:String.raw`// 使用 ioredis；查不到时返回 null
async function getUser(id: string): Promise<User | null> {
  const key = "user:" + id;
  try {
    const s = await redis.get(key); // 未命中时返回 null
    // TODO 1：命中时：值是空串说明数据库里也没有，返回 null；否则解析 JSON 返回
    ...
  } catch (err) {
    // TODO 2：缓存故障时记一条日志，然后往下走，降级查库
    ...
  }
  const user = await db.findUser(id);
  // TODO 3：数据库也查不到时，缓存一个空值（TTL 短，比如 60 秒）防止穿透，再返回 null
  ...
  // TODO 4：回填缓存：TTL = 10 分钟 + 随机抖动，避免大量 key 同时过期
  ...
  return user;
}`,
rust:String.raw`use rand::Rng;
use redis::AsyncCommands;

// 查不到时返回 Ok(None)
async fn get_user(con: &mut redis::aio::MultiplexedConnection, id: &str) -> Result<Option<User>, AppError> {
    let key = format!("user:{}", id);
    match con.get::<_, Option<String>>(&key).await {
        // TODO 1：命中空串：数据库里也没有，返回 Ok(None)；命中其他值：解析 JSON 成功就返回
        ...
        Ok(None) => {} // 未命中
        // TODO 2：缓存故障时打印日志，然后往下走，降级查库
        Err(e) => ...,
    }
    // TODO 3：查数据库；查不到时缓存一个空值（TTL 短，比如 60 秒）防止穿透，再返回 Ok(None)
    let Some(user) = ... else {
        ...
    };
    // TODO 4：回填缓存：TTL = 10 分钟 + 随机抖动，避免大量 key 同时过期
    ...
    Ok(Some(user))
}`,
},

'be-x3-15':{
python:String.raw`import socket
import struct

MAX_FRAME = 1 << 20  # 1MB

def read_exact(sock: socket.socket, n: int) -> bytes:
    """读满 n 个字节；TCP 一次 recv 可能只拿到一部分，所以要循环读。"""
    buf = bytearray()
    # TODO 1：循环 recv，直到读满 n 个字节；recv 返回空说明连接提前关闭，抛出异常
    ...
    return bytes(buf)

def read_frame(sock: socket.socket) -> bytes:
    # TODO 2：读满 4 个字节的长度头，按大端序解析成无符号整数（struct.unpack(">I", ...)）
    (n,) = ...
    # TODO 3：长度超过 MAX_FRAME 时抛出异常，防止恶意大帧耗尽内存
    ...
    # TODO 4：再读满整帧数据并返回
    return ...`,
go:String.raw`const maxFrame = 1 << 20 // 1MB

func ReadFrame(r io.Reader) ([]byte, error) {
    var head [4]byte
    // TODO 1：读满 4 个字节的长度头（io.ReadFull）
    ...
    // TODO 2：按大端序解析长度（binary.BigEndian）
    n := ...
    // TODO 3：长度超过 maxFrame 时返回错误，防止恶意大帧耗尽内存
    ...
    // TODO 4：再读满整帧数据并返回
    ...
}`,
java:String.raw`static final int MAX_FRAME = 1 << 20; // 1MB

static byte[] readFrame(DataInputStream in) throws IOException {
    // TODO 1：读 4 个字节的长度（readInt 按大端序读，不够会一直等）
    int n = ...;
    // TODO 2：长度小于 0 或超过 MAX_FRAME 时抛出异常，防止恶意大帧耗尽内存
    ...
    // TODO 3：再读满整帧数据（readFully）并返回
    ...
}`,
ts:String.raw`import type { Socket } from "node:net";

const MAX_FRAME = 1 << 20; // 1MB

// Node.js 的 socket 是“推”数据的：收到多少就给多少，所以要自己攒够再切帧
function onFrames(sock: Socket, handle: (frame: Buffer) => void): void {
  let buf = Buffer.alloc(0);
  sock.on("data", chunk => {
    buf = Buffer.concat([buf, chunk]);
    // 攒够 4 个字节（长度头）才能开始切帧
    while (buf.length >= 4) {
      // TODO 1：按大端序读出长度（readUInt32BE）
      const n = ...;
      // TODO 2：长度超过 MAX_FRAME 时销毁连接，防止恶意大帧
      ...
      // TODO 3：数据还没收全（不足 4 + n 个字节）时，等下一批
      ...
      // TODO 4：切出这一帧交给 handle，再把它从 buf 里去掉
      ...
    }
  });
}`,
rust:String.raw`use std::io::{self, Read};

const MAX_FRAME: u32 = 1 << 20; // 1MB

fn read_frame(r: &mut impl Read) -> io::Result<Vec<u8>> {
    let mut head = [0u8; 4];
    // TODO 1：读满 4 个字节的长度头（read_exact）
    ...
    // TODO 2：按大端序解析长度（u32::from_be_bytes）
    let n = ...;
    // TODO 3：长度超过 MAX_FRAME 时返回 InvalidData 错误，防止恶意大帧耗尽内存
    ...
    // TODO 4：再读满整帧数据并返回
    ...
}`,
},
};
