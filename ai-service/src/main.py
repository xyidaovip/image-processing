# ai-service/src/main.py
# ... (其他 imports)
import uuid
import os
from PIL import Image

# ...

# 确保这个目录存在
PROCESSED_DIR = "/app/uploads/processed"
os.makedirs(PROCESSED_DIR, exist_ok=True)


@app.post("/api/remove-background", response_model=RemovalResponse)
async def remove_background(file: UploadFile = File(...)):
    # ... (前面的代码)
    try:
        # ... (读取和处理图片的代码)
        image = Image.open(io.BytesIO(image_bytes))
        result = bg_removal_service.remove_background(image)

        # 👇 ----- 开始添加的部分 -----
        # 保存蒙版文件
        mask_image = Image.fromarray(result["mask"])
        mask_filename = f"mask-{uuid.uuid4()}.png"
        mask_path = os.path.join(PROCESSED_DIR, mask_filename)
        mask_image.save(mask_path)
        # 👆 ----- 结束添加的部分 -----
        
        # ... (message 创建)

        return RemovalResponse(
            success=True,
            confidence=result["confidence"],
            processing_time=result["processing_time"],
            message=message,
            mask_path=mask_path  # 👈 将路径添加到响应中
        )
    # ... (异常处理)

# ... (文件的其余部分)
