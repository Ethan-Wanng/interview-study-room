import {A,type Story} from '../story';

// 网络面试题动画（一）：ping、TCP 基础与握手异常。
export const osF:Record<string,Story>={
 'q-7eaa08c3883d24fd':{title:'ping 是怎么工作的',beats:[
  {say:'ping 一台服务器：发出一个 ICMP Echo Request（回声请求），对方回一个 Echo Reply。',add:[A('me','💻','你的电脑',100,170,{tone:'primary'}),A('srv','🖥️','服务器',540,170,{tone:'primary'})],send:[{from:'me',to:'srv',text:'Echo Request'}]},
  {say:'发出去之前，系统先查路由，再用 ARP（IPv6 用邻居发现）找到下一跳的 MAC 地址。',add:[A('arp','📍','路由 → ARP 找下一跳',320,60,{kind:'tag'})]},
  {say:'收到回复，算出往返时间（RTT），统计丢了多少包。',send:[{from:'srv',to:'me',text:'Echo Reply · 12ms',tone:'ok'}]},
  {say:'ping 通只说明 ICMP 这条路通，不代表某个 TCP 端口或业务正常；ping 不通也可能只是防火墙禁了 ICMP。',add:[A('fw','🧱','防火墙可能禁 ICMP',320,300,{kind:'tag',tone:'warm'})],bubble:{who:'srv',text:'ping 通，\n但 80 端口没开'}},
  {say:'traceroute 利用 TTL 逐跳过期来探测经过的路径，和 ping 的目的不同。',memo:['ICMP 请求 + 回复，算 RTT','ping 通 ≠ 端口和业务正常']},
 ]},
 'q-9cafb41f379b66d3':{title:'彻底理解 TCP',beats:[
  {say:'TCP 是面向连接、可靠、有序的全双工字节流。先三次握手，交换并确认双方的起始序号。',add:[A('c','💻','客户端',100,170,{tone:'primary'}),A('s','🖥️','服务端',540,170,{tone:'primary'})],send:[{from:'c',to:'s',text:'SYN'},{from:'s',to:'c',text:'SYN+ACK'}]},
  {say:'可靠靠这些：序列号给每个字节编号，ACK 确认收到，丢了就重传，乱序和重复由序号整理，校验和检查损坏。',add:[A('rel','🔢','序号 · ACK · 重传 · 校验',320,60,{kind:'tag',tone:'ok'})],send:[{from:'c',to:'s',text:'数据 seq=1000'},{from:'s',to:'c',text:'ACK 1500',tone:'ok'}]},
  {say:'接收窗口做流量控制：别发得比对方处理得快；拥塞窗口做拥塞控制：别把网络挤爆。',add:[A('win','🪟','接收窗口 · 拥塞窗口',320,290,{kind:'tag'})]},
  {say:'TCP 是字节流，不保留消息边界：发两次可能被一次收完（“粘包”），也可能拆开。要用长度字段或分隔符自己分帧。',bubble:{who:'s',text:'两条消息\n粘在一起了',tone:'warm'}},
  {say:'关闭时两个方向各自发 FIN、回 ACK。注意：TCP 可靠不等于对方应用已经处理或落盘。',memo:['序号、ACK、重传保证可靠有序','字节流无边界，要自己分帧']},
 ]},
 'q-266a817d33c39176':{title:'TCP 和 UDP 的区别',beats:[
  {say:'TCP 像打电话：先接通（建立连接），说的话按顺序、不丢，还会根据对方和网络情况调整语速。',add:[A('tcp','📞','TCP：连接 · 可靠 · 有序',170,80,{kind:'item',tone:'primary'})]},
  {say:'UDP 像寄明信片：每张独立寄出，保留每张的边界，不保证到、不保证顺序，头部也更小。',add:[A('udp','📮','UDP：数据报 · 不保证送达',470,80,{kind:'item',tone:'warm'})]},
  {say:'UDP 适合实时音视频、DNS 查询这种“丢一点没关系、要快”的场景。',add:[A('use','🎥','实时音视频 · DNS',470,220,{kind:'tag'})]},
  {say:'应用也可以在 UDP 上自己做可靠传输，比如 HTTP/3 用的 QUIC。',add:[A('quic','🚀','QUIC 建在 UDP 上',170,220,{kind:'tag',tone:'ok'})]},
  {say:'误区：UDP 不一定更快；对 UDP socket 调 connect 只是设定默认对端，不会变成 TCP 那样的握手连接。',memo:['TCP：可靠有序字节流','UDP：保留边界、不保证送达']},
 ]},
 'q-5e4b02fba660c3d1':{title:'TCP 和 UDP 能绑同一个端口吗',beats:[
  {say:'能。TCP 和 UDP 是两套独立的端口空间，像同一栋楼里的两个信箱区。',add:[A('ip','🏢','同一个 IP',320,70,{kind:'item',tone:'primary'})]},
  {say:'DNS 服务器就是例子：TCP 53 和 UDP 53 同时监听，互不冲突。',add:[A('t','📞','TCP :53',170,200,{kind:'tag',tone:'ok'}),A('u','📮','UDP :53',470,200,{kind:'tag',tone:'ok'})],send:[{from:'ip',to:'t'},{from:'ip',to:'u'}]},
  {say:'限制在同一种协议内部：两个 TCP socket 能否共用同一地址端口，要看 SO_REUSEADDR、SO_REUSEPORT、通配绑定和系统规则。',add:[A('reuse','⚙️','SO_REUSEADDR · SO_REUSEPORT',320,310,{kind:'tag',tone:'warm'})]},
  {say:'判断一个连接要看完整的五元组：协议、源地址、源端口、目的地址、目的端口，不能只看端口号。',bubble:{who:'ip',text:'协议也是\n身份的一部分'}},
  {say:'记住结论。',memo:['TCP、UDP 端口空间独立','同协议共享看 REUSE 选项']},
 ]},
 'q-e48ceda1aa7e7e69':{title:'第三次握手的 ACK 丢了会怎样',beats:[
  {say:'客户端发出 SYN，服务端回 SYN+ACK，客户端再回 ACK 后就进入 ESTABLISHED。',add:[A('c','💻','客户端：ESTABLISHED',120,170,{tone:'primary'}),A('s','🖥️','服务端：SYN-RECEIVED',520,170,{tone:'warm'})],send:[{from:'c',to:'s',text:'ACK（丢了）',tone:'bad'}]},
  {say:'这个 ACK 在路上丢了。服务端没收到，还停在 SYN-RECEIVED，等一会儿超时后重传 SYN+ACK。',send:[{from:'s',to:'c',text:'重传 SYN+ACK',tone:'warm'}]},
  {say:'客户端收到重传的 SYN+ACK，再回一次 ACK，服务端就完成握手了。',send:[{from:'c',to:'s',text:'再次 ACK',tone:'ok'}],tone:{s:'ok'},sub:{s:'服务端：ESTABLISHED'}},
  {say:'另一种情况：客户端已经开始发数据了，数据包里带着有效的 ACK，服务端收到也能顺便完成握手。',add:[A('d','📦','带 ACK 的数据包',320,300,{kind:'tag',tone:'ok'})]},
  {say:'纯 ACK 一般没有自己的重传定时器，恢复靠对端重发或后续报文；超过重试次数服务端就放弃，具体次数由实现和配置决定。',memo:['服务端超时重传 SYN+ACK','客户端的数据包也能补完握手']},
 ]},
 'q-2e7aa8f204997b7d':{title:'收到不正确的 ACK，客户端会发 RST 吗',beats:[
  {say:'要先问清楚：连接处于什么状态？“不正确”具体指什么？',add:[A('c','💻','客户端',110,170,{tone:'primary'}),A('s','🖥️','对端',530,170)]},
  {say:'在 SYN-SENT 状态（刚发出 SYN），收到一个 ACK，但它确认的是客户端根本没发过的序号——这时通常回一个 RST 并丢弃该报文。',sub:{c:'SYN-SENT'},send:[{from:'s',to:'c',text:'ACK=没发过的序号',tone:'bad'},{from:'c',to:'s',text:'RST',tone:'warm'}]},
  {say:'在 ESTABLISHED 状态，重复的 ACK 很常见，完全正常（比如快速重传就靠它）。',sub:{c:'ESTABLISHED'},send:[{from:'s',to:'c',text:'重复 ACK（正常）'}]},
  {say:'确认号超出已发送范围这类异常，通常按规则回一个 ACK 或直接丢弃，并不是一律重置连接；加固过的实现还会用 challenge ACK。',add:[A('ch','🛡️','challenge ACK',320,300,{kind:'tag',tone:'ok'})]},
  {say:'判断时要同时看 SEQ、ACK、标志位和窗口，不能只凭 ACK 值“看着不对”就下结论。',memo:['SYN-SENT 收到无效 ACK → RST','已连接时多为 ACK 或丢弃']},
 ]},
 'q-739c25e2560d6269':{title:'握手时为什么会收到不正确的 ACK',beats:[
  {say:'正常的第二次握手，ACK 应该等于“客户端起始序号 + 1”，确认的是这一次的 SYN。',add:[A('c','💻','客户端：ISN = 1000',110,170,{tone:'primary'}),A('s','🖥️','服务端',530,170)],send:[{from:'s',to:'c',text:'ACK = 1001 ✓',tone:'ok'}]},
  {say:'原因一：旧连接遗留的 SYN+ACK 在网络里绕了很久才到，正好碰上相同的四元组被复用。',add:[A('old','👻','迟到的旧报文 ACK=501',320,60,{kind:'tag',tone:'warm'})],send:[{from:'old',to:'c',tone:'bad'}]},
  {say:'原因二：伪造的报文（攻击）；原因三：NAT 或中间设备状态错乱；原因四：协议栈本身有缺陷。',add:[A('fake','🦹','伪造 · NAT 错乱 · 协议栈缺陷',320,300,{kind:'tag',tone:'bad'})]},
  {say:'单纯的丢包只会引起重传或重复，不会自己把正确的 ACK 变成任意数字。',bubble:{who:'c',text:'这个 ACK\n不是给我的'}},
  {say:'要靠抓包确认：是不是旧报文，两端的真实状态是什么。',memo:['正确：ACK = 本次 ISN + 1','旧报文、伪造、中间设备是主因']},
 ]},
 'q-ea946e5279f32359':{title:'已建立的 TCP 连接又收到 SYN',beats:[
  {say:'一条连接已经是 ESTABLISHED，突然又收到一个 SYN。先确认：它是匹配这个四元组的，还是别的新连接？',add:[A('c','💻','客户端',110,170),A('s','🖥️','服务端：ESTABLISHED',520,170,{tone:'primary'})],send:[{from:'c',to:'s',text:'SYN？',tone:'warm'}]},
  {say:'按 RFC 5961 加固的协议栈：不直接销毁连接，而是回一个 challenge ACK，然后丢掉这个 SYN——防止有人伪造 SYN 把正常连接打断。',send:[{from:'s',to:'c',text:'challenge ACK',tone:'ok'}],add:[A('ch','🛡️','RFC 5961 challenge ACK',320,300,{kind:'tag',tone:'ok'})]},
  {say:'如果客户端确实重启过，自己已经没有这个连接了，它收到 challenge ACK 后会回一个合法的 RST。',tone:{c:'warm'},sub:{c:'已重启，无此连接'},send:[{from:'c',to:'s',text:'RST',tone:'warm'}]},
  {say:'服务端收到这个 RST，才清理旧连接；客户端再重新握手。',tone:{s:'quiet'},sub:{s:'旧连接已清理'}},
  {say:'历史实现和报文检查顺序有差别，要结合内核版本和抓包看，不能一句话说成“一律重新三次握手”。',memo:['先回 challenge ACK，丢弃 SYN','对端已重启 → RST 清理旧连接']},
 ]},
};
