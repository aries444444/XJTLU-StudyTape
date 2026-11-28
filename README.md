<div align="center">

<img src="dist/assets/favicon.svg" width="72" alt="Study Tape" />

# Study Tape · 学时

**把时间装进磁带，让每一段专注都有迹可循。**

A cassette-inspired study timer with a real-time tuition clock.

![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-f0d77a?style=flat-square)
![Calendar](https://img.shields.io/badge/XJTLU-2026%E2%80%932027-8fc7b5?style=flat-square)
![Local first](https://img.shields.io/badge/Data-Local_first-203a4b?style=flat-square)

[在线体验](https://aries444444.github.io/XJTLU-StudyTape/) · [计费规则](#学费如何计时) · [本地运行](#本地运行) · [校历原件](dist/assets/academic-calendar-2026-27.pdf)

</div>

---

## 关于学时

Study Tape 是一个为西浦学习生活设计的专注计时器。复古磁带界面搭配深蓝、薄荷绿与奶油白，将专注记录与学年学费放在同一个时钟里：看见时间经过，也看见时间的价值。

学费按校历中的**有效在校工作日**换算，正式开学起算，周末与假期暂停。

## 功能一览

| | 功能 | 说明 |
| :--: | :-- | :-- |
| 📼 | 专注随身听 | 磁带风格界面，支持番茄钟与正计时、暂停与继续 |
| ⏳ | 学费时钟 | 按有效在校时间实时换算已消耗学费与剩余金额 |
| 🎛️ | 自选年学费 | **¥93,000 / ¥99,000 / 自定义** |
| 🎵 | 白噪音 | 窗边细雨、林间溪流、柔和氛围，可调音量、随专注启停 |
| 🗓️ | 学年校历 | 查看教学、复习、考试阶段及排除日期，附原始 PDF |
| 📊 | 专注记录 | 保存学习记录、查看统计，并导出 CSV |
| 💾 | 本地保存 | 设置和记录保存在当前浏览器，无需注册 |

## 学费如何计时

### 一个学年，一套校历

默认使用 **2026–2027 学年校历**，以中国时间计算。

| 项目 | 默认值 |
| :-- | :-- |
| 起始日 | 2026 年 9 月 7 日，正式教学开始 |
| 结束日 | 2027 年 6 月 11 日，包含当天 |
| 第一学期有效日 | 81 天 |
| 第二学期有效日 | 76 天 |
| 全学年有效日 | **157 天** |

仅计入教学、复习及考试的周一至周五，并排除校历标记的假期与关闭日。注册迎新、冬夏学校不计入；毕业典礼不额外扣除。

### 每秒的时间成本

```text
每秒费率 = 年学费 ÷（有效在校日数 × 24 × 60 × 60）
已消耗金额 = 已经过的有效在校秒数 × 每秒费率
剩余金额 = 年学费 − 已消耗金额
```

每个有效工作日按 **24 小时**计时。非有效日在学费时钟中暂停；关闭网页后再次打开，会依据实际经过的有效时间恢复。

日期范围可在原校历范围内调整。默认不包含补考；若结束日延长至 2027 年 8 月 6 日，补考复习与补考阶段共增加 15 个有效日。

<details>
<summary><strong>专注时间与学费时间有什么关系？</strong></summary>

专注计时可以在任何一天使用。只有与有效计费日重叠的专注时间，才会换算为对应的时间价值；周末与假期仍可学习并记录时长，金额为 0。

暂停期间不计入专注时间。番茄钟在后台到时后，时长以预设目标封顶；正计时继续累计。跨午夜的记录会按时间区间拆分今日统计。

进行中的专注与每条记录均保留开始时的费率和日期范围。

</details>

## 开始使用

1. 打开[在线网站](https://aries444444.github.io/XJTLU-StudyTape/)。
2. 在设置中选择年学费，确认学年日期范围。
3. 开始一段专注，或切换到校历查看计费日期。
4. 在记录页面回顾学习时间，需要时导出 CSV。
5. 在随身听的“白噪音”中选择声音并点击开启，可勾选“随专注启停”。音量与选择会自动保存。

## 数据与隐私

设置、专注记录和运行中的计时器保存在当前设备、当前浏览器的 `localStorage`，最多保留 5,000 条记录。

清除网站数据或更换设备前，可导出 CSV 留存记录。

## 本地运行

使用支持内置测试运行器的现代 Node.js，无需安装第三方依赖。

```bash
git clone https://github.com/aries444444/XJTLU-StudyTape.git
cd XJTLU-StudyTape
npm start
```

打开 <http://127.0.0.1:4173>。

```bash
npm test
```

测试覆盖有效计费日、节假日排除、跨日统计、金额换算及计时器恢复等核心逻辑。

## 项目结构

```text
XJTLU-StudyTape/
├── dist/                 # 可直接托管的网站
│   ├── index.html        # 页面结构
│   ├── styles.css        # 界面样式
│   ├── app.js            # 交互与本地记录
│   ├── core.js           # 校历与计费逻辑
│   ├── cassette.js       # 磁带效果
│   ├── ambient.js        # 白噪音与播放控制
│   └── assets/           # 校历 PDF、字体与图标
├── test/                 # 核心逻辑测试
├── server.mjs            # 本地静态服务器
└── .github/workflows/    # GitHub Pages 发布流程
```

## 部署

网站由 HTML、CSS 和原生 JavaScript 构成，直接托管 `dist/` 即可。所有资源使用相对路径，支持部署到仓库子路径。

GitHub Pages：在仓库 **Settings → Pages → Source** 中选择 **GitHub Actions**。推送到 `main` 会运行测试并发布，也可在 Actions 页面手动启动 `Publish Study Tape`。

## 资料与字体

- 计算依据：[2026–2027 学生校历](dist/assets/academic-calendar-2026-27.pdf)。
- 数字字体：Barlow，随网站本地提供；[字体许可证](dist/assets/barlow-license.txt)。

---

<div align="center">
  <sub>Study Tape · 按下播放，开始今天的专注。</sub>
</div>
