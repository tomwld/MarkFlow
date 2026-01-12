# MarkFlow MVP 阶段1：核心功能清单

## 1. 基础编辑体验

* **实时预览，双向同步**：Markdown源码与渲染内容实时同步，保持格式一致性

* **基本Markdown语法支持**：

  * 标题（# 至 ######）
  * 段落与换行
  * 粗体（**text**，__text__）与斜体（_text_，*text*）,同时加粗斜体（***text***,___text___）
  * 无序列表（-、\*、+）与有序列表（1.）
    1. **项目1🐷**
    2. **项目2🐶**
    3. **项目3🐍🐅🐴🐎**
  * 任务列表（- \[ ]、- \[x]）
    - [x] 待完成任务
    - [x] 待完成任务
    - [x] 待完成任务
    **其他的**
  * 代码块（\`\`\` language）与行内代码（`code`）
  * 
***这是一行***
**这是第二行**
~~这是第三行~~

## 段落


```html
  <div class="flex items-center bg-gray-100 dark:bg-[#252526] border-b border-gray-200 dark:border-gray-700 overflow-x-auto no-scrollbar select-none">
    <div 
      v-for="doc in documents" 
      :key="doc.id"
      class="group flex items-center gap-2 px-3 py-2 text-sm border-r border-gray-200 dark:border-gray-700 cursor-pointer min-w-[120px] max-w-[200px] h-9"
      :class="[
        activeId === doc.id 
          ? 'bg-white dark:bg-[#1e1e1e] text-blue-600 dark:text-blue-400' 
          : 'bg-transparent text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-[#2d2d2d]'
      ]"
      :title="doc.filePath || doc.title"
      @click="emit('select', doc.id)"
      @auxclick.middle="emit('close', doc.id)"
    >
      <div class="flex-1 truncate relative pr-2">
        <span class="truncate">{{ doc.title }}</span>
        <!-- Dirty Indicator (Dot) -->
        <span 
          v-if="doc.isModified" 
          class="absolute -right-0 top-0.5 w-1.5 h-1.5 rounded-full bg-blue-500"
        ></span>
      </div>
      
      <!-- Close Button -->
      <div 
        class="w-5 h-5 flex items-center justify-center rounded-sm opacity-0 group-hover:opacity-100 hover:bg-gray-300 dark:hover:bg-gray-600 transition-opacity"
        @click.stop="emit('close', doc.id)"
      >
        <div class="i-carbon-close text-xs"></div>
      </div>
    </div>
  </div>
```

```java
package com.wuld.escort;

@Data
public class Person {
  private String name;
  private Long id;
  private Integer age;
  private Date birthday;
}
```

  * 引用区块（>）
    > 这是一个引用，来自哪里哪里
    >> 嵌套引用
    >>>更深的嵌套
    >>>>再一层嵌套
  * 链接（[text](https://chat.qwen.ai/c/url)）与图片

    [百度](https://www.baidu.com)
    ![美女](https://ts1.tc.mm.bing.net/th/id/OIP-C.rAzIUHScvAJZYEnsOYB3oAHaNK?rs=1&pid=ImgDetMain&o=7&rm=3)
  * 水平线（---、\*\*\*）
  * 表格（符合GitHub Flavored Markdown标准）
    
| Header 1 | Header 2 | Header3 |
| -------- | -------- | ------- |
| Cell 1   | Cell 2   | Cell3   |
| Cell 21  | Cell 22  |         |
| Cell 31  | Cell 32  |         |

  * 脚注（\[^1]）
[^1]三尺剑，[^2]六钧[^7]弓。人间清暑殿[^3]，人间广寒宫[^4]。两岸晓烟杨柳绿[^5]，一园春雨杏花红[^6]。

[^4]: 人间广寒宫：嫦娥居所

[^3]: 人间清暑殿：洛阳城内。

[^1]: 《汉书》载，高祖刘邦被黥布流矢射中，医生说：“可以治好。”高祖说：“我提三尺剑来打天下，一切依靠命定。命数由上天掌握，即使是扁鹊这样的名医又能有什么用呢？”古代剑长为三尺，故称三尺剑。

[^2]: 此处指拉力较强的一种弓。钧，古代重量单位，三十斤为一钧。

* **自动格式化**：

  * 智能列表缩进
  * 自动创建列表项
  * 输入时自动应用正确格式
    - [x] Task item
    - [x] Task item

## 2. 用户界面

* **极简界面设计**：

  * 无边框窗口设计（macOS）
  * 隐藏式菜单栏（通过Alt键显示）
  * 可调整编辑区域宽度

* **专注模式**：

  * 标题栏和工具栏自动隐藏
  * 背景虚化效果
  * 当前活动段落高亮

* **状态栏**：

  * 字数统计
  * 文档总字数
  * 光标位置（行/列）
  * 编辑/预览模式指示器

* **基础主题**：

  * 浅色主题（默认）
  * 深色主题
  * 高对比度模式

## 3. 文件操作

* **基础文件管理**：

  * 新建文档（Ctrl/Cmd+N）
  * 打开文档（Ctrl/Cmd+O）
  * 保存文档（Ctrl/Cmd+S）
  * 另存为（Ctrl/Cmd+Shift+S）
  * 自动保存（每5分钟）

* **最近文档列表**：

  * 显示最近打开的10个文档
  * 文档路径显示

* **文件格式支持**：

  * .md（Markdown标准格式）
  * .markdown
  * .txt（导入为纯文本）


## 4. 导出功能

* **PDF导出**：

  * 保留所有格式和样式
  * 页眉/页脚包含文档标题和页码
  * 适合打印的布局

* **HTML导出**：

  * 完整的HTML文档
  * 内联CSS样式
  * 响应式设计

* **导出对话框**：

  * 标准系统保存对话框
  * 默认文件名基于文档标题
  * 格式选择（PDF/HTML）
## 5. 其他功能

* **自定义主题**：
* 自定义字体大小和颜色
* 自定义代码块样式
* 是的是的
* 电费
  1.


[^5]: 两岸晓烟

[^6]: 医院春雨

[^7]: 钧：古代计量单位，三十斤为一钧。