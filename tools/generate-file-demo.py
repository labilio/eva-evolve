"""Regenerate the explicit demo PDF with ReportLab and a local Unicode font."""
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
pdfmetrics.registerFont(TTFont('EvaSample','/System/Library/Fonts/Supplemental/Arial Unicode.ttf'))
target=Path(__file__).resolve().parent.parent/'prototype/assets/file-samples/a-2409-demo.pdf'
c=canvas.Canvas(str(target),pagesize=(595,842));c.setTitle('A-2409 来料异常分析报告 - 演示样例')
c.setFillColorRGB(.12,.14,.17);c.setFont('EvaSample',22);c.drawString(48,770,'A-2409 来料异常分析报告')
c.setFont('EvaSample',11);c.setFillColorRGB(.4,.43,.48);c.drawString(48,739,'演示样例 · 用于验证群聊文件转存和项目共享流程')
sections=[('文件来源','质量与排产群 · 当前版本 v1'),('异常摘要','示例批次出现尺寸偏差，待结合现场检测记录核验。'),('临时处置','示例操作：隔离待核验批次，并整理供应商提供的资料。'),('后续工作','补充现场验证记录，由负责人确认最终处理意见。'),('共享边界','转存后，项目成员可访问此文件；来源群聊天记录不随文件公开。')]
y=680
for title,body in sections:
 c.setFillColorRGB(.12,.14,.17);c.setFont('EvaSample',14);c.drawString(48,y,title)
 c.setFont('EvaSample',11);c.setFillColorRGB(.33,.35,.39);c.drawString(48,y-27,body);y-=97
c.setFont('EvaSample',10);c.drawString(48,60,'本页为原型测试材料，不代表真实供应商数据或业务结论。');c.drawRightString(545,60,'1 / 1');c.save()
