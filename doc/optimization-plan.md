# 项目后续优化计划

本文用于沉淀当前项目下一阶段值得推进的优化方向，作为后续修改计划的基础文档。

## 一、目标

当前项目已经完成了以下一批高价值改动：

- 播放详情页视觉统一与可读性优化
- 设置页视觉统一
- GitHub Release 发布链路改到个人仓库
- 本地文件夹媒体源支持
- 媒体库设置页中文化与交互可理解性增强
- 媒体源选择改为卡片式功能入口

下一阶段的重点不再是“把功能做出来”，而是：

1. 提升可维护性
2. 提升大媒体库场景下的性能
3. 减少后续迭代的结构性阻力
4. 统一发布与项目信息配置

---

## 二、优先级建议

建议按以下优先级推进：

### P1
1. 拆分媒体库主模块职责
2. 优化远程媒体扫描成本
3. 补全播放缓存失效与清理策略

### P2
4. 拆分 `SettingMediaLibrary.vue`
5. 统一设置页文案国际化方案
6. 统一项目发布元数据

### P3
7. 精简 pack / publish 脚本矩阵
8. 继续完善媒体库设置页的图标化与引导细节

---

## 三、具体优化项

## 1. 媒体库主模块职责过重

### 问题
当前媒体库主模块同时承担了：

- 连接配置定义
- SMB / WebDAV / Local 三类来源接入
- 扫描流程
- 元数据提取
- 播放 URL 生成
- 本地缓存处理

这些职责耦合在一个文件内，后续再扩展来源类型、扫描策略、缓存策略时，维护成本会快速上升。

### 证据
- `src/main/modules/mediaLibrary/index.ts:19`
- `src/main/modules/mediaLibrary/index.ts:89`
- `src/main/modules/mediaLibrary/index.ts:296`
- `src/main/modules/mediaLibrary/index.ts:414`

### 风险
- 修改一个来源的逻辑容易影响其他来源
- 不利于单元测试和后续定位问题
- 后续再增加功能时会让文件继续膨胀

### 建议方案
建议把媒体库模块拆成以下层次：

- `mediaLibrary/adapters/local.ts`
- `mediaLibrary/adapters/smb.ts`
- `mediaLibrary/adapters/webdav.ts`
- `mediaLibrary/scan.ts`
- `mediaLibrary/play.ts`
- `mediaLibrary/metadata.ts`
- `mediaLibrary/index.ts` 仅做统一编排与导出

### 后续实施目标
- 各来源只负责“列目录 / 读文件 / 取播放地址”
- 扫描调度与数据写库从 adapter 中剥离
- 播放 URL 与缓存逻辑独立维护

---

## 2. 远程媒体扫描成本偏高

### 问题
当前远程扫描过程中，WebDAV / SMB 大概率需要读取完整文件再提取元数据。这在文件较多或单文件较大时会造成明显扫描成本。

### 证据
- WebDAV 扫描：`src/main/modules/mediaLibrary/index.ts:296`
- SMB 扫描：`src/main/modules/mediaLibrary/index.ts:378`

### 风险
- NAS / WebDAV 场景下扫描耗时长
- 带宽消耗偏高
- 网络抖动时失败率更高
- 用户会感知为“媒体库导入慢”

### 建议方案
分阶段推进：

#### 第一阶段
- 增加扫描并发限制
- 增加更清晰的扫描进度与统计
- 对错误做更细粒度分类

#### 第二阶段
- 尝试只读取音频文件头部做 metadata 解析
- 对不支持的格式再退回完整读取

#### 第三阶段
- 设计“快速扫描 + 后台补全元数据”机制

### 后续实施目标
- 优先优化远程来源首次扫描体验
- 在大媒体库场景下减少阻塞感

---

## 3. 播放缓存策略需要补全失效机制

### 问题
当前媒体播放缓存已有基础能力，但还缺少更明确的缓存失效与清理策略。

### 证据
- cache 目录相关：`src/main/modules/mediaLibrary/index.ts:167`
- 播放缓存 key 相关：`src/main/modules/mediaLibrary/index.ts:414`
- 可用于版本识别的字段：`src/main/modules/mediaLibrary/index.ts:163`

### 风险
- 文件更新后仍命中旧缓存
- 临时目录体积持续增长
- 用户难以理解缓存内容何时刷新

### 建议方案
- 将 `versionToken` 纳入缓存 key
- 增加启动时或扫描后的失效缓存清理
- 对本地缓存文件增加过期策略
- 对缓存命中 / 重新生成做更明确日志

### 后续实施目标
- 保证更新后可及时播放新内容
- 控制缓存目录增长

---

## 4. `SettingMediaLibrary.vue` 组件过大

### 问题
媒体库设置页组件当前同时负责：

- 来源类型卡片
- 当前类型提示
- 表单渲染
- 字段校验
- 保存 / 删除 / 扫描
- 连接列表展示
- 较大量样式

随着交互复杂度继续增加，这个组件会越来越难维护。

### 证据
- 模板与逻辑入口：`src/renderer/views/Setting/components/SettingMediaLibrary.vue:1`
- 组件逻辑主体：`src/renderer/views/Setting/components/SettingMediaLibrary.vue:129`
- 样式主体：`src/renderer/views/Setting/components/SettingMediaLibrary.vue:430`

### 建议方案
拆分为三个组件：

- `MediaSourcePicker.vue`
- `MediaSourceForm.vue`
- `MediaConnectionList.vue`

并在父组件中只保留状态编排。

### 后续实施目标
- 降低单文件复杂度
- 方便继续做 UI 引导与交互增强

---

## 5. 设置页文案国际化不统一

### 问题
当前部分设置页使用 i18n key，部分页面仍然直接写中文或英文文案。最近媒体库设置页为保证交互清晰做了较多硬编码中文，短期合理，但长期会造成维护不一致。

### 证据
- 媒体库设置页：`src/renderer/views/Setting/components/SettingMediaLibrary.vue:2`
- 更新设置页已较多使用 `$t(...)`：`src/renderer/views/Setting/components/SettingUpdate.vue:2`

### 风险
- 后续改文案时需要改组件源码
- 多语言切换成本高
- 设置页内部风格不统一

### 建议方案
- 为媒体库设置页新增完整语言 key
- 建立“设置页新增文案默认进入 i18n”的约束
- 先统一高频页面，再逐步清理旧页面

### 后续实施目标
- 让设置页文案维护方式统一
- 为后续国际化扩展留好基础

---

## 6. 发布相关元数据还没有完全切到个人仓库

### 问题
当前 GitHub Release 发布目标已经改到个人仓库，但项目元信息仍有部分沿用旧仓库配置。

### 证据
- 发布目标：`build-config/build-pack.js:47`
- 仓库与主页信息：`package.json:91`

### 风险
- 页面跳转仍然进入旧仓库
- issue / homepage / repository 信息不一致
- 发版后的外部认知不统一

### 建议方案
统一这些字段：

- `repository.url`
- `bugs.url`
- `homepage`
- 如有必要再检查 app 内 about / update 提示里是否引用旧信息

### 后续实施目标
- 让发版信息、仓库信息、用户入口保持一致

---

## 7. 打包与发布脚本重复较多

### 问题
`package.json` 中 pack / publish 的脚本矩阵较大，可维护性一般。

### 证据
- `package.json:7`

### 风险
- 新增或删除平台目标时需要重复修改多处
- 容易出现某个脚本漏改

### 建议方案
- 用更统一的参数化调用收敛重复脚本
- 先收敛 Windows 相关脚本，再看 Linux / macOS

### 后续实施目标
- 降低发版维护成本
- 减少脚本配置出错概率

---

## 8. 媒体源卡片仍可继续细化

### 问题
当前来源卡片已经具备：

- 卡片式选择
- 推荐角标
- 已选择状态
- 适用场景
- 当前表单提示

但还可以继续提升识别性与完成度。

### 证据
- 卡片模板：`src/renderer/views/Setting/components/SettingMediaLibrary.vue:12`
- 卡片样式：`src/renderer/views/Setting/components/SettingMediaLibrary.vue:483`

### 建议方案
- 把 `L / S / W` 字母块替换为更明确的小图标
- 对本地文件夹卡片强化“推荐给大多数用户”的表达
- 为 SMB / WebDAV 增加更明确的门槛提示

### 后续实施目标
- 降低第一次使用时的理解成本
- 提升设置页完成度

---

## 四、推荐实施顺序

### 第一阶段：先做结构与性能
1. 拆分 `mediaLibrary/index.ts`
2. 优化远程扫描策略
3. 补全播放缓存失效机制

### 第二阶段：做设置页整理
4. 拆分 `SettingMediaLibrary.vue`
5. 媒体库设置页接入 i18n
6. 继续优化来源选择卡片的图标与文案

### 第三阶段：做发布链路整理
7. 统一仓库元数据
8. 精简打包 / 发布脚本

---

## 五、下一步建议

如果只选一个最值得立即开始的事项，建议优先做：

### 推荐起点
**拆分 `src/main/modules/mediaLibrary/index.ts`**

原因：
- 它已经是后续媒体库功能扩展的主要阻力
- 结构清晰后，扫描优化、缓存优化、本地/SMB/WebDAV 差异化处理都更容易推进

### 备选起点
如果想先选一个风险更低、见效更快的任务，则建议：

**拆分 `src/renderer/views/Setting/components/SettingMediaLibrary.vue`**

---

## 六、备注

本文件先作为“后续修改计划总览文档”。
后续开始具体实施时，建议再按单项任务分别产出：

- 详细拆分方案
- 涉及文件列表
- 具体改动步骤
- 验证清单
