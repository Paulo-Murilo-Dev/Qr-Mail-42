import os
import base64
import secrets
import qrcode
import qrcode.image.svg
from lxml import etree
import time
from tqdm import tqdm
from colorama import Fore, Style, init
from datetime import datetime
import math

init(autoreset=True)

TEMPLATE_PATH = "templates/tmp1Cut.svg"
OUTPUT_DIR = "qr_codes"
LOTE_FILE = "lote.txt"
LOG_FILE = "logs.txt"

AREA_UTIL_LARGURA = 80  # cm
AREA_UTIL_ALTURA = 113  # cm

TAMANHOS = {
    "1": (3, 3),
    "2": (4, 4),
    "3": (5, 5),
}

def gerar_id_unico():
    return base64.urlsafe_b64encode(secrets.token_bytes(4)).decode('utf-8').rstrip('=')

def verificar_id_existe(id_uniq):
    return os.path.exists(f"{OUTPUT_DIR}/{id_uniq}.svg")

def gerar_qr_svg(id_uniq, output_path):
    factory = qrcode.image.svg.SvgPathImage
    qr = qrcode.QRCode(
        version=1,
        error_correction=qrcode.constants.ERROR_CORRECT_L,
        box_size=15,
        border=0
    )
    qr.add_data(f"https://qrmail42.wtf/{id_uniq}")
    qr.make(fit=True)
    img = qr.make_image(image_factory=factory)

    qr_tree = etree.fromstring(img.to_string())
    template_tree = etree.parse(TEMPLATE_PATH)
    root = template_tree.getroot()

    qr_group = etree.Element("g")
    qr_group.attrib["transform"] = "translate(117,117) scale(1)"
    qr_group.append(qr_tree)

    root.append(qr_group)
    template_tree.write(output_path)

def obter_proximo_lote():
    if not os.path.exists(LOTE_FILE):
        with open(LOTE_FILE, 'w') as file:
            file.write("1\n")
        return 1
    with open(LOTE_FILE, 'r') as file:
        lote_atual = int(file.readline().strip())
    proximo_lote = lote_atual + 1
    with open(LOTE_FILE, 'w') as file:
        file.write(f"{proximo_lote}\n")
    return proximo_lote

def registrar_ids_lote(ids_gerados, lote):
    lote_file_path = f"{LOTE_FILE.replace('.txt', f'_{lote}.txt')}"
    with open(lote_file_path, 'w') as file:
        for id_uniq in ids_gerados:
            file.write(f"{id_uniq}\n")

def registrar_log(lote, qtd, tamanho, n_cartelas):
    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    with open(LOG_FILE, 'a') as log:
        log.write(f"[{timestamp}] Lote {lote}: {qtd} adesivos {tamanho}cm, {n_cartelas} cartelas criadas\n")

def calcular_adesivos_por_cartela(lado_cm):
    adesivos_por_linha = AREA_UTIL_LARGURA // lado_cm
    adesivos_por_coluna = AREA_UTIL_ALTURA // lado_cm
    return adesivos_por_linha * adesivos_por_coluna

def gerar_todos(qtd, tamanho_codigo):
    os.makedirs(OUTPUT_DIR, exist_ok=True)
    usados = set()
    ids_gerados = []

    lote = obter_proximo_lote()
    lado_cm_x, lado_cm_y = TAMANHOS[tamanho_codigo]
    adesivos_por_cartela = calcular_adesivos_por_cartela(lado_cm_x)
    n_cartelas = math.ceil(qtd / adesivos_por_cartela)

    print(Fore.CYAN + f"\nÁrea útil: {AREA_UTIL_LARGURA}x{AREA_UTIL_ALTURA}cm")
    print(Fore.CYAN + f"Cada cartela comporta cerca de {adesivos_por_cartela} adesivos de {lado_cm_x}x{lado_cm_y}cm\n")
    print(Fore.CYAN + f"Serão necessárias {n_cartelas} cartelas para {qtd} adesivos.\n")

    cartela_atual = 1
    count_cartela = 0
    pasta_cartela = os.path.join(OUTPUT_DIR, f"cartela_{cartela_atual}")
    os.makedirs(pasta_cartela, exist_ok=True)

    for _ in tqdm(range(qtd), desc="Gerando adesivos", ncols=70):
        idu = gerar_id_unico()
        while idu in usados or verificar_id_existe(idu):
            idu = gerar_id_unico()
        usados.add(idu)

        output_path = os.path.join(pasta_cartela, f"{idu}.svg")
        gerar_qr_svg(idu, output_path)
        ids_gerados.append(idu)

        count_cartela += 1
        if count_cartela >= adesivos_por_cartela:
            cartela_atual += 1
            pasta_cartela = os.path.join(OUTPUT_DIR, f"cartela_{cartela_atual}")
            os.makedirs(pasta_cartela, exist_ok=True)
            count_cartela = 0

    registrar_ids_lote(ids_gerados, lote)
    registrar_log(lote, qtd, f"{lado_cm_x}x{lado_cm_y}", n_cartelas)

    print(Fore.GREEN + f"\nConcluído! {qtd} adesivos {lado_cm_x}x{lado_cm_y}cm criados em {n_cartelas} cartelas.")

if __name__ == "__main__":
    try:
        quantidade = int(input(Fore.MAGENTA + "Quantos adesivos você vai fazer? "))
        print(Fore.MAGENTA + "\nEscolha o tamanho:")
        print("1 - 3x3cm\n2 - 4x4cm\n3 - 5x5cm")
        tamanho = input("Opção: ")

        if tamanho not in TAMANHOS:
            print(Fore.RED + "Tamanho inválido!")
        else:
            gerar_todos(quantidade, tamanho)

    except ValueError:
        print(Fore.RED + "Digite um número válido!")
