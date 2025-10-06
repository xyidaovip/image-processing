# 图像处理服务

## ImageProcessingService

图像处理服务提供背景替换和图像尺寸标准化功能。

### 功能

#### 1. 背景替换 (replaceBackground)

将图像背景替换为纯白色，保持产品边缘的平滑过渡。

**需求覆盖**: 3.1, 3.2, 3.3

```typescript
const processedPath = await imageProcessingService.replaceBackground(
  'path/to/original.jpg',
  'path/to/mask.png',
  '#FFFFFF' // 可选，默认白色
);
```

**特性**:
- 使用蒙版精确分离前景和背景
- 保持产品边缘的平滑过渡效果
- 正确处理透明和半透明区域

#### 2. 图像尺寸标准化 (resizeImage)

将图像调整为1200x1200像素的标准尺寸。

**需求覆盖**: 4.1, 4.2, 4.3, 4.4

```typescript
const resizedPath = await imageProcessingService.resizeImage(
  'path/to/image.png',
  1200, // 目标宽度
  1200  // 目标高度
);
```

**特性**:
- 创建1200x1200像素的白色画布
- 保持产品原始宽高比
- 居中放置产品
- 等比例缩放（仅缩小，不放大）

#### 3. 完整处理流程 (processImage)

执行完整的图像处理流程：背景替换 + 尺寸标准化 + 格式转换。

```typescript
const result = await imageProcessingService.processImage(
  'path/to/original.jpg',
  'path/to/mask.png',
  {
    outputFormat: 'jpg',
    outputSize: { width: 1200, height: 1200 }
  }
);

console.log(result.processedImagePath); // 处理后的图像路径
console.log(result.processingTime);     // 处理耗时（毫秒）
```

### 使用示例

```typescript
import { imageProcessingService } from './services';

async function processProductImage(imagePath: string, maskPath: string) {
  try {
    // 完整处理流程
    const result = await imageProcessingService.processImage(
      imagePath,
      maskPath,
      {
        outputFormat: 'jpg',
        outputSize: { width: 1200, height: 1200 }
      }
    );
    
    console.log(`处理完成: ${result.processedImagePath}`);
    console.log(`耗时: ${result.processingTime}ms`);
    
    return result;
  } catch (error) {
    console.error('图像处理失败:', error);
    throw error;
  }
}
```

### 技术实现

- **Sharp.js**: 高性能图像处理库
- **像素级处理**: 精确控制背景替换和边缘平滑
- **内存优化**: 使用Buffer进行高效的像素操作
- **错误处理**: 完善的错误捕获和提示

### 输出目录

处理后的图像默认保存在 `uploads/processed/` 目录下。
