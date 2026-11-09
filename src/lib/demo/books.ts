import type { Category, ChapterContent } from "@/lib/types";

export interface DemoBook {
  id: string;
  title: string;
  author: string;
  description: string;
  coverPath: string | null;
  format: "txt" | "md" | "epub" | "mobi" | "azw3" | "pdf";
  renderMode: "text" | "pdf";
  chapterCount: number;
  pageCount: number | null;
  wordCount: number;
  categories: Category[];
  createdAt: string;
  chapters: ChapterContent[];
  fileUrl?: string;
}

export const demoCategories: Category[] = [
  { id: "c1000000-0000-4000-8000-000000000001", name: "古典文学", slug: "classic" },
  { id: "c1000000-0000-4000-8000-000000000002", name: "诗词", slug: "poetry" },
  { id: "c1000000-0000-4000-8000-000000000003", name: "现代散文", slug: "prose" },
  { id: "c1000000-0000-4000-8000-000000000004", name: "外文经典", slug: "foreign" },
];

function countWords(html: string): number {
  return html
    .replace(/<[^>]+>/g, "")
    .replace(/\s/g, "")
    .length;
}

function chapter(no: number, title: string, paragraphs: string[]): ChapterContent {
  const content = paragraphs.map((paragraph) => `<p>${paragraph}</p>`).join("");
  return { chapterNo: no, title, content, wordCount: countWords(content) };
}

const guwenChapters: ChapterContent[] = [
  chapter(1, "桃花源记", [
    "晋太元中，武陵人捕鱼为业。缘溪行，忘路之远近。忽逢桃花林，夹岸数百步，中无杂树，芳草鲜美，落英缤纷。渔人甚异之，复前行，欲穷其林。",
    "林尽水源，便得一山，山有小口，仿佛若有光。便舍船，从口入。初极狭，才通人。复行数十步，豁然开朗。土地平旷，屋舍俨然，有良田、美池、桑竹之属。阡陌交通，鸡犬相闻。其中往来种作，男女衣着，悉如外人。黄发垂髫，并怡然自乐。",
    "见渔人，乃大惊，问所从来。具答之。便要还家，设酒杀鸡作食。村中闻有此人，咸来问讯。自云先世避秦时乱，率妻子邑人来此绝境，不复出焉，遂与外人间隔。问今是何世，乃不知有汉，无论魏晋。此人一一为具言所闻，皆叹惋。余人各复延至其家，皆出酒食。停数日，辞去。此中人语云：“不足为外人道也。”",
    "既出，得其船，便扶向路，处处志之。及郡下，诣太守，说如此。太守即遣人随其往，寻向所志，遂迷，不复得路。南阳刘子骥，高尚士也，闻之，欣然规往。未果，寻病终。后遂无问津者。",
  ]),
  chapter(2, "陋室铭", [
    "山不在高，有仙则名。水不在深，有龙则灵。斯是陋室，惟吾德馨。苔痕上阶绿，草色入帘青。谈笑有鸿儒，往来无白丁。可以调素琴，阅金经。无丝竹之乱耳，无案牍之劳形。南阳诸葛庐，西蜀子云亭。孔子云：何陋之有？",
  ]),
  chapter(3, "爱莲说", [
    "水陆草木之花，可爱者甚蕃。晋陶渊明独爱菊。自李唐来，世人甚爱牡丹。予独爱莲之出淤泥而不染，濯清涟而不妖，中通外直，不蔓不枝，香远益清，亭亭净植，可远观而不可亵玩焉。",
    "予谓菊，花之隐逸者也；牡丹，花之富贵者也；莲，花之君子者也。噫！菊之爱，陶后鲜有闻。莲之爱，同予者何人？牡丹之爱，宜乎众矣。",
  ]),
];

const tangshiChapters: ChapterContent[] = [
  chapter(1, "静夜思 · 李白", ["床前明月光，<br/>疑是地上霜。", "举头望明月，<br/>低头思故乡。"]),
  chapter(2, "春晓 · 孟浩然", ["春眠不觉晓，<br/>处处闻啼鸟。", "夜来风雨声，<br/>花落知多少。"]),
  chapter(3, "登鹳雀楼 · 王之涣", ["白日依山尽，<br/>黄河入海流。", "欲穷千里目，<br/>更上一层楼。"]),
  chapter(4, "望庐山瀑布 · 李白", ["日照香炉生紫烟，<br/>遥看瀑布挂前川。", "飞流直下三千尺，<br/>疑是银河落九天。"]),
  chapter(5, "早发白帝城 · 李白", ["朝辞白帝彩云间，<br/>千里江陵一日还。", "两岸猿声啼不住，<br/>轻舟已过万重山。"]),
];

const zhaohuaChapters: ChapterContent[] = [
  chapter(1, "小引（节选）", [
    "我常想在纷扰中寻出一点闲静来，然而委实不容易。目前是这么离奇，心里是这么芜杂。一个人做到只剩了回忆的时候，生涯大概总要算是无聊了罢，但有时竟会连回忆也没有。",
    "中国的做文章有轨范，世事也仍然是螺旋。前几天我离开中山大学的时候，便想起四个月以前的离开厦门大学；听到飞机在头上鸣叫，竟记得了一年前在北京城上日日旋绕的飞机。我那时还做了一篇短文，叫做《一觉》。现在是，连这“一觉”也没有了。",
    "广州的天气热得早，夕阳从西窗射入，逼得人只能勉强穿一件单衣。书桌上的一盆“水横枝”，是我先前没有见过的：就是一段树，只要浸在水中，枝叶便青葱得可爱。看看绿叶，编编旧稿，总算也在做一点事。做着这等事，真是虽生之日，犹死之年，很可以驱除炎热的。",
  ]),
  chapter(2, "狗·猫·鼠（节选）", [
    "从去年起，仿佛听得有人说我是仇猫的。那根据自然是在我的那一篇《兔和猫》；这是自画招供，当然无话可说，——但倒也毫不介意。",
    "一到今年，我可很有点担心了。我是常不免于弄弄笔墨的，写了下来，印了出去，对于有些人似乎总是搔着痒处的时候少，碰着痛处的时候多。万一不谨，甚而至于得罪了名人或名教授，或者更甚而至于得罪了“负有指导青年责任的前辈”之流，可就危险已极。为什么呢？因为这些大脚色是“不好惹”的。",
    "其实人禽之辨，本不必这样严。在动物界，虽然并不如古人所幻想的那样舒适自由，可是噜苏做作的事总比人间少。它们适性任情，对就对，错就错，不说一句分辩话。虫蛆也许是不干净的，但它们并没有自鸣清高；鸷禽猛兽以较弱的动物为饵，不妨说是凶残的罢，但它们从来就没有竖过“公理”“正义”的旗子。",
  ]),
  chapter(3, "阿长与《山海经》（节选）", [
    "长妈妈，已经说过，是一个一向带领着我的女工，说得阔气一点，就是我的保姆。我的母亲和许多别的人都这样称呼她，似乎略带些客气的意思。只有祖母叫她阿长。我平时叫她“阿妈”，连“长”字也不带；但到憎恶她的时候，——例如知道了谋死我那隐鼠的却是她的时候，就叫她阿长。",
    "我们那里没有姓长的；她生得黄胖而矮，“长”也不是形容词。又不是她的名字，记得她自己说过，她的名字是叫作什么姑娘的。什么姑娘，我现在已经忘却了，总之不是长姑娘；也终于不知道她姓什么。",
  ]),
];

function sumWords(chapters: ChapterContent[]) {
  return chapters.reduce((total, item) => total + item.wordCount, 0);
}

export const demoBooks: DemoBook[] = [
  {
    id: "b1000000-0000-4000-8000-000000000001",
    title: "古文观止 · 三篇",
    author: "陶渊明 等",
    description: "公版古文名篇选读：桃花源记、陋室铭、爱莲说。适合在安静的午后，慢慢读一遍。",
    coverPath: "/covers/guwen.svg",
    format: "txt",
    renderMode: "text",
    chapterCount: guwenChapters.length,
    pageCount: null,
    wordCount: sumWords(guwenChapters),
    categories: [demoCategories[0]],
    createdAt: "2026-09-18T08:00:00.000Z",
    chapters: guwenChapters,
  },
  {
    id: "b1000000-0000-4000-8000-000000000002",
    title: "唐诗选",
    author: "李白 等",
    description: "五首耳熟能详的唐诗，静夜思、春晓、登鹳雀楼、望庐山瀑布、早发白帝城。",
    coverPath: "/covers/tangshi.svg",
    format: "epub",
    renderMode: "text",
    chapterCount: tangshiChapters.length,
    pageCount: null,
    wordCount: sumWords(tangshiChapters),
    categories: [demoCategories[1]],
    createdAt: "2026-09-26T08:00:00.000Z",
    chapters: tangshiChapters,
  },
  {
    id: "b1000000-0000-4000-8000-000000000003",
    title: "朝花夕拾 · 节选",
    author: "鲁迅",
    description: "从《朝花夕拾》中选出三篇：小引、狗·猫·鼠、阿长与《山海经》，重温旧时的文字。",
    coverPath: "/covers/zhaohua.svg",
    format: "mobi",
    renderMode: "text",
    chapterCount: zhaohuaChapters.length,
    pageCount: null,
    wordCount: sumWords(zhaohuaChapters),
    categories: [demoCategories[2]],
    createdAt: "2026-10-08T08:00:00.000Z",
    chapters: zhaohuaChapters,
  },
  {
    id: "b1000000-0000-4000-8000-000000000004",
    title: "Aesop's Fables · Selected",
    author: "Aesop",
    description:
      "五则伊索寓言英文原版选读，用于体验 PDF 原版页面阅读器：保留原始排版，可翻页、缩放、记录页码书签。",
    coverPath: "/covers/aesop.svg",
    format: "pdf",
    renderMode: "pdf",
    chapterCount: 0,
    pageCount: 6,
    wordCount: 0,
    categories: [demoCategories[3]],
    createdAt: "2026-10-20T08:00:00.000Z",
    chapters: [],
    fileUrl: "/demo/sample.pdf",
  },
];

export function findDemoBook(id: string): DemoBook | undefined {
  return demoBooks.find((book) => book.id === id);
}
