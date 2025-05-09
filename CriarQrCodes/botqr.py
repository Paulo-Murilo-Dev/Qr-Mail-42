import qrcode
import random
import os

quantidade = 1
# Função para gerar QR Code
def gerar_qr_code(id_uniq):
    # Gerar um conteúdo aleatório (pode ser uma URL, texto, etc.)
    link = f"https://qrmail42.wtf/tarot"
    
    # Gerar o QR Code
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=20,
        border=1,
    )
    
    qr.add_data(link)
    qr.make(fit=True)
    
    # Gerar a imagem do QR Code
    img = qr.make_image(fill='black', back_color='white')
    
    # Salvar o QR Code como imagem (nomeado pelo id_uniq)
    img.save(f"qr_codes/{id_uniq}.png")

# Função para verificar se o ID já existe
def verificar_id_existe(id_uniq):
    if os.path.exists(f"qr_codes/{id_uniq}.png"):
        return True
    return False

# Função para gerar um id único
def gerar_id_unico():
    return random.randint(10000, 99999)

# Gerar os QR Codes
def gerar_qr_codes(qtd):
    os.makedirs("qr_codes", exist_ok=True)
    ids_gerados = set()
    
    for _ in range(qtd):
        id_uniq = gerar_id_unico()
        
        # Verifica se o id já foi gerado
        while id_uniq in ids_gerados or verificar_id_existe(id_uniq):
            id_uniq = gerar_id_unico()
        
        ids_gerados.add(id_uniq)
        
        # Gerar o QR Code
        gerar_qr_code(id_uniq)
        print(f"QR Code {id_uniq} gerado com sucesso!")

# Chama a função para gerar 100 QR Codes
gerar_qr_codes(quantidade)
