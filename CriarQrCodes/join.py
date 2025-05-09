import os
import math
import subprocess
from PIL import Image
import cairosvg

# Configurações da gráfica
TOTAL_WIDTH = 127  # cm
TOTAL_HEIGHT = 90  # cm
USABLE_WIDTH = 113  # cm
USABLE_HEIGHT = 80  # cm
MARGIN_TOP = 11  # cm
MARGIN_BOTTOM = 11  # cm
MARGIN_LEFT = 14.5  # cm
MARGIN_RIGHT = 14.5  # cm
SAFETY_MARGIN = 0.3  # cm (margem de segurança adicional)

# Configurações dos adesivos
STICKER_WIDTH = 4  # cm
STICKER_HEIGHT = 4  # cm

# Configurações de saída
OUTPUT_DIR = 'saidas_corel'
PNG_DIR = os.path.join(OUTPUT_DIR, 'pngs')
DPI = 300  # Resolução para gráfica

def cm_to_px(cm, dpi=DPI):
    """Converte centímetros para pixels considerando DPI"""
    inches = cm / 2.54
    return int(inches * dpi)

def create_directories():
    """Cria os diretórios de saída necessários"""
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    os.makedirs(PNG_DIR, exist_ok=True)

def get_qr_files():
    """Obtém a lista de arquivos SVG de QR codes"""
    qr_dir = 'qr_codes'
    if not os.path.exists(qr_dir):
        raise FileNotFoundError(f"Diretório '{qr_dir}' não encontrado.")
    
    return [f for f in os.listdir(qr_dir) if f.endswith('.svg')]

def convert_svg_to_png(svg_path, png_path):
    """Converte um SVG para PNG em alta qualidade"""
    cairosvg.svg2png(
        url=svg_path,
        write_to=png_path,
        dpi=DPI,
        output_width=cm_to_px(STICKER_WIDTH),
        output_height=cm_to_px(STICKER_HEIGHT)
    )

def calculate_grid():
    """Calcula quantos adesivos cabem na área útil"""
    cols = math.floor((USABLE_WIDTH - 2*SAFETY_MARGIN) / STICKER_WIDTH)
    rows = math.floor((USABLE_HEIGHT - 2*SAFETY_MARGIN) / STICKER_HEIGHT)
    return cols, rows

def generate_pngs(qr_files):
    """Gera todos os PNGs individuais"""
    print("Convertendo QR codes para PNGs individuais...")
    for i, qr_file in enumerate(qr_files, 1):
        svg_path = os.path.join('qr_codes', qr_file)
        png_path = os.path.join(PNG_DIR, f'qr_{i:04d}.png')
        convert_svg_to_png(svg_path, png_path)
    print(f"{len(qr_files)} PNGs gerados em '{PNG_DIR}'")

def create_corel_script(qr_files, cols, rows):
    """Cria script VBA para CorelDRAW para posicionar os PNGs"""
    script = """
    Sub OrganizarAdesivos()
        Dim s As Shape
        Dim i As Integer, j As Integer
        Dim x As Double, y As Double
        Dim totalWidth As Double, totalHeight As Double
        Dim usableWidth As Double, usableHeight As Double
        Dim marginTop As Double, marginBottom As Double
        Dim marginLeft As Double, marginRight As Double
        Dim stickerWidth As Double, stickerHeight As Double
        Dim safetyMargin As Double
        
        ' Configurações (em centímetros)
        totalWidth = 127
        totalHeight = 90
        usableWidth = 113
        usableHeight = 80
        marginTop = 11
        marginBottom = 11
        marginLeft = 14.5
        marginRight = 14.5
        safetyMargin = 0.3
        stickerWidth = 4
        stickerHeight = 4
        
        ' Limpar documento
        ActivePage.Shapes.All.Delete
        ActiveDocument.Unit = cdrCentimeter
        
        ' Criar página com tamanho correto
        ActivePage.SizeWidth = totalWidth
        ActivePage.SizeHeight = totalHeight
        
        ' Importar e posicionar os adesivos
        Dim filePath As String
        Dim counter As Integer
        counter = 1
    """
    
    # Adicionar comandos para cada QR code
    for i in range(rows):
        for j in range(cols):
            idx = i * cols + j
            if idx >= len(qr_files):
                break
            
            x = MARGIN_LEFT + SAFETY_MARGIN + j * STICKER_WIDTH
            y = MARGIN_TOP + SAFETY_MARGIN + i * STICKER_HEIGHT
            
            script += f"""
        ' Adesivo {idx+1}
        filePath = "{os.path.abspath(PNG_DIR)}\\qr_{idx+1:04d}.png"
        If Dir(filePath) <> "" Then
            Set s = ActiveLayer.Import(filePath)
            s.SetPosition x:={x}, y:={TOTAL_HEIGHT - y}
            s.SizeWidth = {STICKER_WIDTH}
            s.SizeHeight = {STICKER_HEIGHT}
        End If
            """
    
    script += """
    End Sub
    """
    
    script_path = os.path.join(OUTPUT_DIR, 'organizar_adesivos.vba')
    with open(script_path, 'w') as f:
        f.write(script)
    
    return script_path

def main():
    try:
        create_directories()
        qr_files = get_qr_files()
        
        if not qr_files:
            raise FileNotFoundError("Nenhum arquivo SVG encontrado na pasta 'qr_codes'")
        
        # Gerar PNGs individuais
        generate_pngs(qr_files)
        
        # Calcular grid
        cols, rows = calculate_grid()
        stickers_per_sheet = cols * rows
        total_sheets = math.ceil(len(qr_files) / stickers_per_sheet)
        
        print(f"\nConfiguração da Cartela:")
        print(f"- Adesivos por cartela: {stickers_per_sheet} ({cols}x{rows})")
        print(f"- Total de cartelas necessárias: {total_sheets}")
        print(f"- Margens de segurança: {SAFETY_MARGIN}cm em todas as bordas")
        
        # Criar script para CorelDRAW
        script_path = create_corel_script(qr_files, cols, rows)
        
        print("\nProcesso concluído com sucesso!")
        print(f"PNGs individuais gerados em: '{PNG_DIR}'")
        print(f"Script para CorelDRAW gerado em: '{script_path}'")
        print("\nInstruções para CorelDRAW:")
        print("1. Abra o CorelDRAW")
        print("2. Pressione Alt+F11 para abrir o Editor VBA")
        print("3. No menu, clique em 'Arquivo' > 'Importar'")
        print(f"4. Selecione o arquivo '{script_path}'")
        print("5. Feche o Editor VBA e pressione Alt+F8")
        print("6. Selecione 'OrganizarAdesivos' e clique em 'Executar'")
        
    except Exception as e:
        print(f"\nErro: {e}")

if __name__ == "__main__":
    main()