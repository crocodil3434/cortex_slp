"""Build the print companion from the same chapter source as /dosya.
Requires reportlab. Run from repository root. No patient records are included.
"""
import json, math, os
from pathlib import Path
from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import Paragraph
from reportlab.lib.styles import ParagraphStyle
from reportlab.lib.enums import TA_LEFT

ROOT=Path(__file__).resolve().parents[1]
data=json.loads((ROOT/'src/content/theracademy.json').read_text())
font_dir=Path(os.environ.get('THERACADEMY_FONT_DIR','/usr/share/fonts/truetype/dejavu'))
pdfmetrics.registerFont(TTFont('TA',str(font_dir/'DejaVuSans.ttf')))
pdfmetrics.registerFont(TTFont('TA-Bold',str(font_dir/'DejaVuSans-Bold.ttf')))
OUT=ROOT/'public/theracademy/theracademy-toplanti-dosyasi.pdf'
OUT.parent.mkdir(parents=True,exist_ok=True)
c=canvas.Canvas(str(OUT),pagesize=(595.28,841.89))
c.setTitle('Theracademy - Toplantı Dosyası'); c.setAuthor('Theracademy')
ink=HexColor('#171c15'); lime=HexColor('#d6fa4d'); paper=HexColor('#f7f7f0'); muted=HexColor('#59614f')
W,H=595.28,841.89

def text(value,x,y,size=12,color=ink,bold=False):
    c.setFillColor(color);c.setFont('TA-Bold' if bold else 'TA',size);c.drawString(x,y,value)
def para(value,x,y,width=475,size=12,color=ink,bold=False):
    style=ParagraphStyle('body',fontName='TA-Bold' if bold else 'TA',fontSize=size,leading=size*1.65,textColor=color,alignment=TA_LEFT)
    p=Paragraph(value,style);_,h=p.wrap(width,700);p.drawOn(c,x,y-h);return y-h

def base(page,label):
    c.setFillColor(paper);c.rect(0,0,W,H,fill=1,stroke=0)
    text('theracademy',50,H-52,19,bold=True)
    text('PROJE DOSYASI / V'+data['version'],345,H-48,8)
    c.setStrokeColor(ink);c.line(50,H-74,W-50,H-74)
    text(label.upper(),50,H-104,9,color=muted)
    c.line(50,58,W-50,58)
    text('GÖRÜŞME TASLAĞI  ·  '+data['date'],50,39,8,color=muted)
    text(f'{page:02}',W-68,39,9)

# Cover
c.setFillColor(ink);c.rect(0,0,W,H,fill=1,stroke=0)
text('theracademy',50,H-60,23,color=lime,bold=True)
text('KLİNİK SİMÜLASYON TEKNOLOJİLERİ',50,H-95,9,color=paper)
for i,line in enumerate(['Bir vakadan','klinik','düşünmeye.']): text(line,48,650-i*62,47,color=paper if i<2 else lime,bold=True)
c.setStrokeColor(lime);c.setLineWidth(.6)
for i in range(22):
    a=i*math.pi/22
    p=c.beginPath()
    for j in range(101):
        t=j*2*math.pi/100;r=89+18*math.cos(3*t+2*a)
        x=420+r*math.cos(t)*math.cos(a)-40*math.sin(t)*math.sin(a)
        y=300+r*math.cos(t)*math.sin(a)+40*math.sin(t)*math.cos(a)
        if j==0:p.moveTo(x,y)
        else:p.lineTo(x,y)
    c.drawPath(p)
para('Sağlık bilimleri eğitimi için geliştirilen klinik simülasyon platformu.',50,345,240,14,paper)
text('TOPLANTI DOSYASI',50,160,10,color=lime,bold=True)
text('Görüşme taslağı / v'+data['version'],50,135,10,color=paper)
text(data['date'],50,115,10,color=paper)
text('Muhammed Furkan Yaya',50,65,10,color=paper)
text('Bir Crocodil ürün girişimi.',50,45,8,color=paper)
c.showPage()

for idx,ch in enumerate(data['chapters']):
    base(idx+2,ch['number']+' / '+ch['label'])
    text(ch['number'],47,650,80,color=HexColor('#9aa774'),bold=True)
    y=para(ch['title'],50,605,470,27,ink,True)-24
    y=para(ch['summary'],50,y,470,14,muted)-30
    c.setStrokeColor(HexColor('#c3c9b8'));c.line(50,y,W-50,y);y-=24
    y=para(ch['detail'],50,y,470,11)-24
    for point in ch['points']:
        c.setFillColor(HexColor('#859b36'));c.circle(55,y-8,2.5,fill=1,stroke=0)
        y=para(point,68,y,452,10)-12
    if y<110: raise ValueError('Page overflow: '+ch['id'])
    text('SUNUM EŞLEŞMESİ',50,108,8,color=muted)
    text('/dosya#'+ch['id'],50,89,10)
    c.showPage()
base(9,'Görüşme notları')
y=para('Bir sonraki adımı birlikte tanımlayalım.',50,690,475,27,ink,True)-32
for title,desc in [
    ('Akademik değerlendirme','Vaka incelemesi, öğrenme hedefleri ve pilot ölçütleri için sorumlu kişiler.'),
    ('Pilot kapsamı','Ders / bölüm, katılımcı grubu, takvim, gerekli izinler ve değerlendirme yöntemi.'),
    ('Girişim geliştirme','Kuluçka, çalışma alanı, şirketleşme, iş modeli ve fon başvuru planı.')]:
    y=para(title,50,y,475,14,ink,True)-8;y=para(desc,50,y,475,10,muted)-22
    for _ in range(2):c.setStrokeColor(HexColor('#c3c9b8'));c.line(50,y,W-50,y);y-=25
    y-=15
text('İLETİŞİM',50,155,8,color=muted)
text('Muhammed Furkan Yaya · Dil ve Konuşma Terapisti',50,134,10)
text('dktfurkan@gmail.com',50,112,10)
c.showPage()
base(10,'Kapsam ve varsayımlar')
y=para('Neyi biliyoruz? Neyi sınayacağız?',50,690,475,27,ink,True)-30
for title,desc in [
    ('Ürün odağı','İlk odak dil ve konuşma terapisi ve akıcılık bozukluklarıdır. Vitrindeki örnek vaka bağımsız olarak yazılmış sentetik bir gösterimdir; hasta verisi içermez.'),
    ('Araştırma gündemi','Öğrenme etkisi, kullanım kolaylığı, kurumsal satın alma süreci, ödeme isteği ve sürdürülebilir içerik üretim maliyeti araştırılacaktır.'),
    ('Henüz doğrulanmamış olanlar','Bu dosyada fiyat, pazar büyüklüğü, müşteri sayısı veya etkililik yüzdesi verilmez. Gelir modelleri ve dönemler öneri niteliğindedir.'),
    ('İçerik dayanağı','Ürün kapsamı, Theracademy proje kararları ve TA-CI-00 / TA-CI-FLU-01 v0.9 taslak protokolünün genel kapsamıyla uyumludur. Taslak protokol akademik onay yerine geçmez. Klinik vaka kayıtları bu dosyaya aktarılmamıştır.'),
    ('Sunumla birlikte kullanım','01-07 bölüm numaraları web sunumuyla eşleşir. Web dosyası: /dosya. Kalıcı yayın adresi netleştiğinde baskıya QR bağlantısı eklenmelidir.')]:
    y=para(title,50,y,475,13,ink,True)-8;y=para(desc,50,y,475,10,muted)-23
if y<75: raise ValueError('Notes overflow')
c.save();print(OUT)
