import type {AiLevel} from '../journey';

// 高阶：I/O 模型、零拷贝和写盘。
export const beIo:AiLevel={id:'be-io',title:'I/O 模型、epoll 与零拷贝',summary:'阻塞与非阻塞、同步与异步、多路复用、写盘和 DMA',lessons:[
  {title:'这一关学什么：高并发服务器的底层秘密',body:'一台服务器同时维持几万个连接，却只用几个线程，这是怎么做到的？答案就在 I/O 模型里。\n上一关已经初步认识了这些概念，这一关动手把它们弄明白：\n一、阻塞和非阻塞、同步和异步，亲手看到非阻塞 read 返回的“没数据”；\n二、select、poll、epoll 的区别，亲手用一个线程同时服务多个连接；\n三、写文件时数据要经过哪几层缓冲，write、flush、fsync 各自做到了哪一步；\n四、零拷贝和 DMA，以及机械硬盘和 SSD 在磁盘调度上的区别。'},
  {title:'一次网络读取的两个阶段',body:'从网络上读数据分两个阶段：\n阶段一：等数据。对方的数据要经过网络到达本机，放进内核的 socket 接收缓冲区，这可能要等很久；\n阶段二：拷数据。把数据从内核的缓冲区复制到你程序的内存里，这一步很快。\n据此可以分出几种 I/O 模型：\n阻塞 I/O：调用 read 后，两个阶段都在那里等着，最简单，但一个线程同一时间只能服务一个连接；\n非阻塞 I/O：阶段一不等，没数据就立刻返回 EAGAIN，需要你自己反复来问；\nI/O 多路复用：用 select/poll/epoll 同时等很多个连接的阶段一，哪个就绪了再去 read 它；\n异步 I/O：两个阶段都交给内核，全部完成后再通知你，比如 Linux 的 io_uring。\n前三种在阶段二都要你自己调用 read，所以都属于同步 I/O。用了 epoll 并不等于用了异步 I/O。'},
  {title:'动手试试：非阻塞读取会立刻返回',body:'我们用 Python 创建一对互相连接的 socket，把其中一个设成非阻塞。数据还没发送时去读，看看会发生什么；发送之后再读一次。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 nonblock.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python nonblock.py（Mac 用 python3 nonblock.py），对照下面的输出。','把 b.setblocking(False) 这一行删掉再运行：第一次读会一直卡住等数据，只能按 Ctrl+C 结束。这就是阻塞 I/O。'],expect:'数据还没到： BlockingIOError\n数据到了： b\'ping\''},code:`import socket
import time

a, b = socket.socketpair()
b.setblocking(False)
try:
    b.recv(1024)
except BlockingIOError as e:
    print("数据还没到：", type(e).__name__)
a.send(b"ping")
time.sleep(0.1)
print("数据到了：", b.recv(1024))`,explain:[{at:'import socket',to:'import time',text:'导入 socket 和 time 模块。'},{at:'a, b = socket.socketpair()',text:'创建一对已经连接好的 socket：往 a 里写的数据，可以从 b 读出来。'},{at:'b.setblocking(False)',text:'把 b 设成非阻塞模式。'},{at:'try:',to:'b.recv(1024)',text:'现在还没有任何数据，就去读。'},{at:'except BlockingIOError as e:',to:'print("数据还没到：", type(e).__name__)',text:'非阻塞的读不会等待，而是立刻抛出 BlockingIOError，它对应的就是系统调用返回的 EAGAIN（“现在没有，过会儿再试”）。'},{at:'a.send(b"ping")',text:'从 a 发送 4 个字节。'},{at:'time.sleep(0.1)',text:'稍等一下，让数据到达 b 的接收缓冲区。'},{at:'print("数据到了：", b.recv(1024))',text:'这次有数据了，立刻读到 ping。'}]},
  {title:'select、poll、epoll 的区别',body:'三者都是“I/O 多路复用”：让一个线程同时等待很多个连接，告诉你哪些已经可以读写了。区别在于效率：\nselect：用一个位图表示要关注的文件描述符（每个连接对应一个编号），数量受 FD_SETSIZE 限制，常见是 1024。每次调用都要把整个位图复制给内核，内核逐个检查；返回后你还要逐个检查哪些就绪了；\npoll：用数组代替位图，没有了 1024 的限制，但每次依然要把全部连接传给内核、全部扫描一遍；\nepoll：分成三步。epoll_create 创建一个 epoll 实例；epoll_ctl 把要关注的连接注册进去，内核会一直记着，不用每次重新传；epoll_wait 等待，只返回已经就绪的连接。所以开销只和活跃连接数有关，不随总连接数增长。\n服务器有 1 万个连接、每次只有几十个活跃时，epoll 的效率远高于 select 和 poll。',code:`epfd := epoll_create1(0)
epoll_ctl(epfd, EPOLL_CTL_ADD, connFd, EPOLLIN)
for {
    n := epoll_wait(epfd, events, -1)
    for i := 0; i < n; i++ {
        handle(events[i])
    }
}`,explain:[{at:'epfd := epoll_create1(0)',text:'创建一个 epoll 实例（这里是示意的伪代码，展示调用顺序）。'},{at:'epoll_ctl(epfd, EPOLL_CTL_ADD, connFd, EPOLLIN)',text:'把一个连接注册进去，关注“可读”事件。每个连接只需要注册一次，内核会一直记住。'},{at:'for {',text:'事件循环，一直运行。'},{at:'n := epoll_wait(epfd, events, -1)',text:'等待，直到有连接就绪。-1 表示没有就一直等。返回值 n 是就绪的连接数，events 里只有这些就绪的连接。'},{at:'for i := 0; i < n; i++ {',to:'handle(events[i])',text:'只处理就绪的那几个连接，不用扫描全部连接。'}]},
  {title:'水平触发和边缘触发',body:'epoll 通知“连接可读”有两种模式：\n水平触发（LT，默认）：只要接收缓冲区里还有没读完的数据，每次 epoll_wait 都会再通知你。这次少读了也没关系，比较不容易出错；\n边缘触发（ET）：只有在缓冲区从“没有数据”变成“有新数据”的那一刻通知一次。收到通知后如果只读了一部分，剩下的数据不会再被通知，直到下次又有新数据到达，这些数据就像被“遗忘”了。\n所以用 ET 模式时必须：\n一、把连接设成非阻塞；\n二、收到通知后循环读，一直读到返回 EAGAIN，确认缓冲区读空了为止。\n否则一旦在阻塞模式下最后一次 read 没有数据，整个线程就会卡在那里。'},
  {title:'动手试试：一个线程服务多个连接',body:'Python 的 selectors 模块会自动选择当前系统最好的多路复用机制：Linux 上是 epoll，Mac 上是 kqueue，Windows 上是 select。我们用它写一个只有一个线程的服务端，同时管理监听 socket 和多个客户端连接，谁就绪就处理谁。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 selector_server.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python selector_server.py（Mac 用 python3 selector_server.py），对照下面的输出。','在 clients 函数的名字列表里再加几个名字，看看服务端是不是依然只用一个线程就全部处理了。'],expect:'客户端收到： 你好，小明\n客户端收到： 你好，小红\n客户端收到： 你好，小刚\n一个线程服务了 3 个连接'},code:`import selectors
import socket
import threading

sel = selectors.DefaultSelector()
srv = socket.socket()
srv.bind(("127.0.0.1", 0))
srv.listen()
srv.setblocking(False)
sel.register(srv, selectors.EVENT_READ)

def clients():
    for name in ["小明", "小红", "小刚"]:
        with socket.create_connection(srv.getsockname()) as c:
            c.sendall(name.encode())
            print("客户端收到：", c.recv(1024).decode())

t = threading.Thread(target=clients)
t.start()
served = 0
while served < 3:
    for key, _ in sel.select(timeout=1):
        if key.fileobj is srv:
            conn, _ = srv.accept()
            conn.setblocking(False)
            sel.register(conn, selectors.EVENT_READ)
        else:
            conn = key.fileobj
            data = conn.recv(1024)
            conn.sendall("你好，".encode() + data)
            sel.unregister(conn)
            conn.close()
            served += 1
t.join()
print("一个线程服务了", served, "个连接")`,explain:[{at:'import selectors',to:'import threading',text:'selectors 是 Python 对 select/poll/epoll 的封装。'},{at:'sel = selectors.DefaultSelector()',text:'创建一个选择器，自动使用当前系统最高效的机制。'},{at:'srv = socket.socket()',to:'srv.listen()',text:'创建服务端 socket，绑定本机的一个空闲端口，开始监听。'},{at:'srv.setblocking(False)',text:'设成非阻塞。'},{at:'sel.register(srv, selectors.EVENT_READ)',text:'把监听 socket 注册进去：有新连接到来时，它会变成“可读”。'},{at:'def clients():',text:'模拟客户端，在另一个线程里运行。'},{at:'for name in ["小明", "小红", "小刚"]:',to:'print("客户端收到：", c.recv(1024).decode())',text:'三个客户端依次连接、发送自己的名字，并打印服务端的回复。'},{at:'t = threading.Thread(target=clients)',to:'t.start()',text:'启动客户端线程。下面的服务端逻辑全部在主线程这一个线程里完成。'},{at:'served = 0',text:'记录已经服务了几个连接。'},{at:'while served < 3:',text:'事件循环。'},{at:'for key, _ in sel.select(timeout=1):',text:'等待就绪的事件，只返回已经就绪的 socket。'},{at:'if key.fileobj is srv:',to:'sel.register(conn, selectors.EVENT_READ)',text:'监听 socket 就绪，说明有新连接：接受它，设成非阻塞，也注册进选择器。'},{at:'else:',to:'data = conn.recv(1024)',text:'某个客户端连接就绪，说明它发来了数据，读出来。'},{at:'conn.sendall("你好，".encode() + data)',text:'回复问候。'},{at:'sel.unregister(conn)',to:'served += 1',text:'处理完就取消关注、关闭连接，计数加一。'},{at:'t.join()',to:'print("一个线程服务了", served, "个连接")',text:'等客户端线程结束，打印结果。'}]},
  {title:'写文件要经过三层',body:'程序把数据写到文件里，数据其实要依次经过三个地方：\n一、应用自己的缓冲区：为了减少系统调用，很多语言的文件库会先把数据攒在程序自己的内存里，比如 Python 的文件对象、Go 的 bufio.Writer。这时连 write 系统调用都还没发生。调用 flush 才会把它交给内核；\n二、内核的页缓存：write 系统调用返回成功，数据就到了这里，成为“脏页”，由内核在后台慢慢写回磁盘；\n三、磁盘：调用 fsync（或者只同步数据、不同步修改时间等元数据的 fdatasync），等它返回成功，数据才真正落盘。\n不同的故障丢的数据不同：进程崩溃时，第一层里还没 flush 的数据会丢，已经交给内核的不会丢；机器断电时，第一层和第二层里还没落盘的数据都会丢。'},
  {title:'动手试试：看看 flush 和 fsync 的作用',body:'我们用 Python 写一行日志，分别在 write 之后、flush 之后查看文件的大小，最后调用 fsync 确保数据落盘。',practice:{steps:['确认装好了 Python 3：终端输入 python --version（Mac 可能是 python3 --version），能看到 3.x 的版本号就行。','新建文件 flush_demo.py，把下面的代码复制进去保存。','在终端里进入文件所在的文件夹，运行 python flush_demo.py（Mac 用 python3 flush_demo.py），对照下面的输出。','把 f.flush() 这一行注释掉（在前面加 #）再运行，看看第二行打印的大小变成了多少。'],expect:'write 之后，文件大小： 0\nflush 之后，文件大小： 16\nfsync 返回了，数据已经写到磁盘'},code:`import os

path = "demo.log"
f = open(path, "w", encoding="utf-8", newline="\\n")
f.write("第一行日志\\n")
print("write 之后，文件大小：", os.path.getsize(path))
f.flush()
print("flush 之后，文件大小：", os.path.getsize(path))
os.fsync(f.fileno())
print("fsync 返回了，数据已经写到磁盘")
f.close()
os.remove(path)`,explain:[{at:'import os',text:'os 模块提供 fsync、查看文件大小等操作系统功能。'},{at:'path = "demo.log"',text:'要写的文件名。'},{at:'f = open(path, "w", encoding="utf-8", newline="\\n")',text:'以写入模式打开文件，用 UTF-8 编码，换行固定写成 \\n（Windows 默认会写成两个字符的 \\r\\n）。'},{at:'f.write("第一行日志\\n")',text:'写入一行：5 个汉字各 3 字节，加一个换行符，共 16 字节。但现在它只在 Python 自己的缓冲区里。'},{at:'print("write 之后，文件大小：", os.path.getsize(path))',text:'文件大小还是 0：数据还没交给操作系统。如果程序这时崩溃，这行日志就丢了。'},{at:'f.flush()',text:'把缓冲区的数据交给操作系统，也就是调用 write 系统调用，数据进入内核的页缓存。'},{at:'print("flush 之后，文件大小：", os.path.getsize(path))',text:'现在操作系统知道这个文件有 16 字节了。即使程序这时崩溃，数据也不会丢，但机器断电仍可能丢。'},{at:'os.fsync(f.fileno())',text:'要求操作系统把这个文件的数据真正写到磁盘，等写完才返回。fileno() 是文件在操作系统里的编号。'},{at:'print("fsync 返回了，数据已经写到磁盘")',text:'这时即使断电，数据也在了。'},{at:'f.close()',to:'os.remove(path)',text:'关闭文件，并删除这个演示文件。'}]},
  {title:'怎么才算真正落盘',body:'需要确保数据不丢的场景（比如数据库日志、订单流水、配置文件），可以这样做：\n一、先把应用层的缓冲 flush 掉（Go 的 bufio.Writer 要调用 Flush）；\n二、调用 fsync 或 fdatasync，并且一定要检查它的返回值：返回失败说明数据可能没写进去，不能当作成功处理；\n三、新建文件时，除了文件本身，还要 fsync 一下它所在的目录，确保“这个目录里有这个文件”的记录也落盘了；\n四、需要整体替换一个文件时，先写到一个临时文件、fsync，再用 rename 一步替换原文件，rename 是原子的，不会出现写了一半的文件。\n每次 fsync 都要等磁盘，很慢。数据库会把多个事务的日志攒在一起做一次 fsync（组提交），在安全和性能之间取得平衡。'},
  {title:'零拷贝：mmap 和 sendfile',body:'传统的“读文件再发到网络”，数据要经过：磁盘 →（DMA）→ 内核页缓存 →（CPU 拷贝）→ 用户缓冲区 →（CPU 拷贝）→ socket 缓冲区 →（DMA）→ 网卡。中间两次 CPU 拷贝和多次用户态、内核态切换，其实都没有必要，因为程序并不修改这些数据。\n两种减少拷贝的办法：\nmmap：把文件直接映射到程序的地址空间，程序读写这块内存就是读写页缓存，省掉了“页缓存 → 用户缓冲区”这一次拷贝。之后用 write 发送时仍要拷贝到 socket 缓冲区；\nsendfile：一个系统调用直接让内核把页缓存里的数据交给 socket，数据完全不经过用户态。如果网卡支持，连 socket 缓冲区这次拷贝也能省掉，由网卡直接从页缓存读取。\nKafka 把消息发给消费者、Nginx 发送静态文件，都用 sendfile，主要省掉的是 CPU 在用户态和内核态之间来回拷贝数据的开销。\n注意“零拷贝”指的是零次 CPU 拷贝，DMA 的拷贝依然存在，并不是一次拷贝都没有。'},
  {title:'DMA：CPU 只负责布置任务',body:'DMA（直接内存访问）是一个专门搬运数据的硬件部件。没有 DMA 时，从磁盘读数据需要 CPU 自己一点点地把数据从设备搬到内存，期间 CPU 被完全占用。\n有了 DMA，过程变成：\n一、CPU 配置好 DMA 的“任务说明”（描述符）：从哪个设备、读多少、放到内存的什么位置；\n二、CPU 去执行别的任务；\n三、DMA 自己完成数据的搬运；\n四、搬完后，设备发一个中断通知 CPU，CPU 再处理后续工作，比如唤醒正在等这些数据的进程。\n所以 DMA 并不是让 I/O 完全不需要 CPU，CPU 仍然负责配置和处理完成中断，只是不用亲自搬数据了。'},
  {title:'机械硬盘和 SSD：磁盘调度的重要性不同',body:'机械硬盘（HDD）里有高速旋转的盘片和一个来回移动的磁头。读写数据前，磁头要先移动到正确的磁道（寻道），再等盘片转到正确的位置，这些机械动作要花好几毫秒。所以随机读写非常慢，顺序读写快得多。\n因此机械硬盘上，磁盘调度算法非常重要：把一批请求按照磁头移动的方向重新排序（类似电梯来回运行的“电梯算法”），减少磁头来回移动的距离，能大幅提升性能。\nSSD（固态硬盘）没有机械部件，访问任何位置的速度几乎一样，随机读写也很快，而且内部有很多通道可以并行处理请求。复杂的排序反而只会增加延迟，所以 Linux 对 SSD 通常使用最简单的 none 或 mq-deadline 调度器。\n这也解释了为什么数据库、Kafka 都喜欢顺序写日志：顺序写在机械硬盘上快得多，在 SSD 上也更友好。'}
 ],quiz:[
 {id:'be-io-1',q:'非阻塞 socket 上调用 read，数据还没到，会发生什么？',options:['一直阻塞等到数据到来','立刻返回 EAGAIN 错误','程序直接崩溃退出','返回 0 表示连接已关闭'],why:['一直等待是阻塞 socket 的行为。','','没有数据只是暂时不可读，不会导致崩溃。','返回 0 表示对端关闭了连接，而不是暂时没有数据。'],answer:1,explain:'非阻塞调用不会等待，没有数据时返回 EAGAIN（或 EWOULDBLOCK），需要配合 epoll 等待可读事件；read 返回 0 才表示对端关闭。',interview:'q-91a8f84073b3f1fe'},
 {id:'be-io-2',type:'judge',q:'用了 epoll，就是“异步 I/O”。',answer:false,explain:'epoll 只是就绪通知，数据仍由应用调用 read 拷贝，属于同步 I/O。',interview:'q-c6f65211e594ea8c'},
 {id:'be-io-3',q:'服务器有 1 万个连接，每次只有几十个活跃，哪种方式效率最高？',options:['select 轮询','poll 轮询','epoll 事件通知','一连接一线程'],why:['select 每次都要传入并扫描全部 fd，而且有 1024 的数量限制。','poll 没有数量限制，但每次仍要扫描全部 fd。','','1 万个线程会消耗大量内存，上下文切换开销也很大。'],answer:2,explain:'epoll_wait 只返回就绪连接，不需要每次扫描全部。',interview:'q-2c9515ac92903960'},
 {id:'be-io-4',type:'fill',q:'select 能监听的文件描述符数量受 ____ 限制，常见是 1024。',accepted:['FD_SETSIZE','fd_setsize'],explain:'poll 和 epoll 没有这个小上限。',interview:'q-2c9515ac92903960'},
 {id:'be-io-5',q:'epoll 使用边缘触发（ET）时，下面哪种做法是必须的？',options:['每次只从 socket 读取一个字节','设为非阻塞并读到 EAGAIN','同时使用 select 辅助检查可读','关闭 socket 的 TCP_NODELAY 选项'],why:['一次只读一个字节效率极低，读不完剩下的数据还会丢失通知。','','混用 select 并不能解决 ET 只通知一次的问题。','TCP_NODELAY 控制的是 Nagle 算法，与 epoll 触发模式无关。'],answer:1,explain:'ET 只在状态变化时通知一次，必须一次读到 EAGAIN；如果用阻塞 socket，最后一次读会把线程卡住。'},
 {id:'be-io-6',q:'进程调用 write 写日志成功后立刻崩溃（机器没断电），这些数据会怎样？',options:['数据随进程一起全部丢失','已进页缓存，之后仍会写回磁盘','数据还停留在 CPU 的高速缓存中','写入磁盘的数据会变成乱码'],why:['进程崩溃不影响内核中的数据，只有断电或内核崩溃才会丢失未落盘的部分。','','write 返回后数据已经交给内核，与 CPU 缓存无关。','数据内容不会因为进程崩溃而损坏。'],answer:1,explain:'进程崩溃不影响内核里的脏页；断电才会丢未落盘的部分。',interview:'q-4d79d9e36de19dab'},
 {id:'be-io-7',type:'multi',q:'想确保数据真的落到磁盘，下面哪些做法是对的？（多选）',options:['调用 fsync 并检查返回值','新建或改名文件后同步父目录','write 返回成功就足够了','用户态缓冲先 Flush 再 fsync'],why:['','','write 成功只代表数据进入了内核页缓存，断电时仍可能丢失。',''],answers:[0,1,3],explain:'write 成功只代表进了页缓存。',interview:'q-4d79d9e36de19dab'},
 {id:'be-io-8',q:'Nginx、Kafka 发送文件时用 sendfile，主要省掉了什么？',options:['省掉了 DNS 的域名解析过程','省掉用户态与内核间的拷贝','省掉了建立连接的 TCP 三次握手','省掉了从磁盘读取文件的过程'],why:['DNS 解析发生在建立连接之前，与发送文件无关。','','连接仍然需要握手建立。','数据仍要从磁盘读到页缓存，只是不再拷贝到用户态。'],answer:1,explain:'内核直接把页缓存的数据交给 socket。',interview:'q-1ff0f10ea03551b5'},
 {id:'be-io-9',type:'judge',q:'有了 DMA，CPU 在 I/O 过程中完全不需要参与。',answer:false,explain:'CPU 仍要配置描述符、处理完成中断、管理缓冲，只是不用逐字节搬数据。',interview:'q-c27a84be9ecfdf3e'},
 {id:'be-io-10',type:'short',q:'机械硬盘和 SSD 上，磁盘调度算法的重要性有什么不同？',reference:'机械硬盘要移动磁头寻道，调度算法（SCAN 电梯算法、C-SCAN、LOOK 等）通过调整请求顺序减少寻道距离，同时防止饥饿，影响很大。SSD 没有机械寻道，随机访问也很快，传统寻道优化意义不大；现代 Linux 多队列块层对 NVMe 常用 none 或 mq-deadline，更关注公平和延迟，要以压测结果为准。',points:['机械盘：减少寻道是关键','SCAN / C-SCAN / LOOK 防饥饿','SSD 无寻道，调度意义变小','NVMe 常用 none / mq-deadline，以压测为准'],explain:'同一个问题要结合硬件回答。',interview:'q-79ca7d2d3eb09607'},
]};
