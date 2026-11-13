import argparse
import datetime as dt
import math
import os
import re
import secrets
import sqlite3
import threading
import time
import sys
import traceback
from pathlib import Path

from flask import Flask, abort, jsonify, render_template, request

BASE = Path(__file__).resolve().parent
DB_PATH = Path(os.environ.get("ESM_DB", BASE / "esports_manager.db"))
# ===== เปลี่ยนรหัสผ่านผู้ดูแลที่นี่ =====
DEFAULT_ADMIN_PASSWORD = "admin1234"
# ถ้าตั้งตัวแปร ESM_ADMIN_PASSWORD ไว้ จะใช้ค่านั้นแทน (ตัดช่องว่างและเครื่องหมายคำพูดหัวท้ายออกให้)
_env_pw = os.environ.get("ESM_ADMIN_PASSWORD", "").strip().strip('"').strip("'")
ADMIN_PASSWORD = _env_pw or DEFAULT_ADMIN_PASSWORD
PASSWORD_SOURCE = "ตัวแปร ESM_ADMIN_PASSWORD" if _env_pw else "DEFAULT_ADMIN_PASSWORD ใน app.py"
MAX_BODY = 8 * 1024 * 1024          # รวมรูปภาพที่ย่อแล้ว
MAX_IMG = 2 * 1024 * 1024
TOKEN_TTL = 12 * 3600

app = Flask(__name__, static_folder="templates/static", static_url_path="/static")
app.config["MAX_CONTENT_LENGTH"] = MAX_BODY
app.json.ensure_ascii = False
app.json.sort_keys = False


# =====================================================================
# ข้อมูลตั้งต้น
# =====================================================================
def norm(s):
    return re.sub(r"[^a-z0-9\u0e00-\u0e7f+]", "", str(s or "").lower())


def parse_agents(s):
    out = []
    for part in str(s or "").split(";"):
        a = part.strip().split()
        if len(a) >= 5:
            def n(x):
                try:
                    return int(x)
                except ValueError:
                    return 0
            out.append({"n": a[0], "g": n(a[1]), "w": n(a[2]), "k": n(a[3]), "d": n(a[4])})
    return out


# ทีมพาร์ทเนอร์ 21 ทีม [ชื่อทีม, ลีก] (ตรงกับ VCT_TEAMS ใน list.js)
SEED_TEAMS = [
    ["100 Thieves", "Americas"],
    ["G2 Esports", "Americas"],
    ["LOUD", "Americas"],
    ["NRG", "Americas"],
    ["Sentinels", "Americas"],
    ["EDWARD Gaming", "CN"],
    ["TYLOO GAMING", "CN"],
    ["Weibo Gaming", "CN"],
    ["Xi Lai Gaming", "CN"],
    ["FNATIC", "EMEA"],
    ["FUT Esports", "EMEA"],
    ["Gentle Mates", "EMEA"],
    ["Karmine Corp", "EMEA"],
    ["Team Heretics", "EMEA"],
    ["Team Vitality", "EMEA"],
    ["FULL SENSE", "Pacific"],
    ["Gen.G", "Pacific"],
    ["Paper Rex", "Pacific"],
    ["Rex Regum Qeon", "Pacific"],
    ["T1", "Pacific"],
    ["ZETA DIVISION", "Pacific"],
]

# นักแข่งชุดปี 2026 [ทีม, ชื่อในเกม, ตำแหน่ง, สถิติ [[ตัวละคร, เกม, ชนะ, Kill, Death], ...]]
# สถิติจาก vlr.gg VCT 2026 Stage 2 (แบ่งตาม % การเลือกตัวละคร) จำนวนชนะประมาณจากผลแมปของทีม
SEED_PLAYERS = [
    ["100 Thieves", "vora", "Initiator · IGL", [["Sova", 12, 9, 170, 156], ["Fade", 8, 6, 113, 104], ["Skye", 1, 1, 15, 14]]],
    ["100 Thieves", "Asuna", "Duelist", [["Phoenix", 20, 14, 355, 292], ["Omen", 1, 1, 19, 15]]],
    ["100 Thieves", "Cryocells", "Sentinel", [["Cypher", 16, 11, 241, 207], ["Viper", 3, 2, 44, 38], ["Chamber", 2, 1, 32, 27]]],
    ["100 Thieves", "bang", "Controller", [["Omen", 13, 9, 183, 175], ["Harbor", 7, 5, 97, 93], ["Viper", 1, 1, 15, 14]]],
    ["100 Thieves", "Timotino", "Duelist", [["Neon", 17, 12, 280, 250], ["Jett", 4, 3, 66, 59]]],
    ["G2 Esports", "valyn", "Controller · IGL", [["Omen", 17, 10, 246, 255], ["Harbor", 7, 4, 99, 103], ["Astra", 6, 4, 86, 89]]],
    ["G2 Esports", "jawgemo", "Duelist", [["Neon", 21, 13, 306, 340], ["Raze", 4, 2, 57, 63], ["Phoenix", 2, 1, 31, 34]]],
    ["G2 Esports", "trent", "Initiator", [["Sova", 13, 8, 194, 172], ["Skye", 12, 7, 180, 160], ["Fade", 5, 3, 77, 68]]],
    ["G2 Esports", "leaf", "Controller", [["Viper", 16, 10, 245, 227], ["Sage", 5, 3, 79, 73], ["Yoru", 3, 2, 46, 43]]],
    ["G2 Esports", "babybay", "Sentinel", [["Chamber", 19, 11, 290, 269], ["Vyse", 6, 4, 92, 85], ["Waylay", 3, 2, 46, 43]]],
    ["LOUD", "pANcada", "Controller", [["Omen", 7, 4, 93, 68], ["Harbor", 3, 2, 59, 47], ["Clove", 1, 1, 21, 7]]],
    ["LOUD", "cauanzin", "Initiator", [["Sova", 19, 11, 265, 292], ["Fade", 11, 6, 123, 161], ["Skye", 3, 2, 22, 40]]],
    ["LOUD", "lukxo", "Sentinel", [["Chamber", 23, 13, 423, 323], ["Yoru", 4, 2, 74, 57], ["Viper", 2, 1, 34, 26]]],
    ["LOUD", "Darker", "Controller", [["Omen", 14, 8, 189, 206], ["Phoenix", 5, 3, 67, 73], ["Viper", 5, 3, 67, 73]]],
    ["LOUD", "Virtyy", "Duelist", [["Jett", 19, 11, 289, 279], ["Raze", 8, 5, 122, 111], ["Neon", 5, 3, 82, 67]]],
    ["LOUD", "erde", "Controller", [["Omen", 14, 8, 205, 191], ["Sage", 13, 8, 191, 178], ["Astra", 3, 2, 46, 42]]],
    ["NRG", "Ethan", "Initiator · IGL", [["KAY/O", 11, 7, 144, 154], ["Phoenix", 4, 3, 52, 55], ["Omen", 3, 2, 40, 43]]],
    ["NRG", "keiko", "Duelist", [["Jett", 8, 5, 122, 111], ["Chamber", 5, 3, 78, 71], ["Omen", 4, 3, 61, 56]]],
    ["NRG", "mada", "Duelist", [["Neon", 11, 7, 170, 162], ["Phoenix", 4, 3, 61, 58], ["Harbor", 4, 3, 61, 58]]],
    ["NRG", "skuba", "Controller", [["Viper", 9, 6, 125, 116], ["Cypher", 6, 4, 82, 76], ["Omen", 6, 4, 82, 76]]],
    ["NRG", "brawk", "Initiator", [["Sova", 19, 12, 286, 251], ["Vyse", 3, 2, 46, 41]]],
    ["Sentinels", "johnqt", "Controller", [["Harbor", 6, 3, 89, 78], ["Omen", 3, 1, 46, 40], ["Phoenix", 3, 1, 46, 40]]],
    ["Sentinels", "Reduxx", "Controller", [["Omen", 10, 5, 150, 154], ["Phoenix", 9, 4, 135, 138], ["Jett", 1, 0, 15, 15]]],
    ["Sentinels", "cortezia", "Controller", [["Viper", 6, 3, 88, 82], ["Vyse", 6, 3, 88, 82], ["Cypher", 5, 2, 74, 68]]],
    ["Sentinels", "JonahP", "Initiator", [["Sova", 10, 5, 126, 146], ["Fade", 9, 4, 113, 131], ["Skye", 1, 0, 13, 15]]],
    ["Sentinels", "Jerrwin", "Duelist", [["Waylay", 9, 4, 129, 147], ["Neon", 8, 4, 115, 130], ["Raze", 3, 1, 43, 49]]],
    ["EDWARD Gaming", "nobody", "Initiator · IGL", [["Sova", 17, 9, 253, 237], ["Skye", 3, 2, 46, 43], ["Fade", 2, 1, 30, 28]]],
    ["EDWARD Gaming", "ZmjjKK", "Duelist", [["Jett", 12, 7, 220, 196], ["Neon", 7, 4, 128, 114], ["Chamber", 1, 1, 20, 18]]],
    ["EDWARD Gaming", "CHICHOO", "Sentinel", [["Cypher", 12, 7, 197, 170], ["Viper", 8, 4, 129, 111], ["Phoenix", 1, 1, 18, 15]]],
    ["EDWARD Gaming", "cb", "", [["Sova", 13, 7, 177, 187], ["Fade", 6, 3, 86, 87], ["Skye", 3, 2, 40, 43]]],
    ["EDWARD Gaming", "Smoggy", "Controller", [["Omen", 10, 5, 130, 159], ["Harbor", 4, 2, 52, 64], ["Raze", 3, 2, 40, 49]]],
    ["EDWARD Gaming", "Jieni7", "Initiator", [["KAY/O", 13, 7, 176, 186], ["Omen", 7, 4, 95, 101], ["Vyse", 1, 1, 15, 16]]],
    ["TYLOO GAMING", "sword9", "IGL", [["Sova", 18, 13, 272, 257], ["Fade", 8, 6, 120, 115], ["Skye", 4, 3, 55, 55]]],
    ["TYLOO GAMING", "slowly", "Duelist", [["Waylay", 8, 6, 153, 118], ["Jett", 7, 5, 131, 101], ["Chamber", 6, 4, 114, 88]]],
    ["TYLOO GAMING", "splash", "Duelist", [["Raze", 9, 6, 163, 136], ["Neon", 8, 6, 146, 122], ["Phoenix", 7, 5, 125, 104]]],
    ["TYLOO GAMING", "Scales", "Sentinel", [["Cypher", 11, 8, 165, 155], ["Viper", 9, 6, 134, 126], ["Sage", 6, 4, 89, 84]]],
    ["TYLOO GAMING", "Erv", "Controller", [["Omen", 22, 15, 301, 293], ["KAY/O", 3, 2, 41, 40], ["Waylay", 3, 2, 41, 40]]],
    ["Weibo Gaming", "Satoshi", "Duelist", [["Jett", 12, 6, 207, 173], ["Raze", 5, 2, 74, 67], ["Neon", 3, 2, 50, 44]]],
    ["Weibo Gaming", "chenze", "Duelist", [["Jett", 12, 6, 192, 178], ["Raze", 5, 2, 78, 70], ["Neon", 3, 2, 51, 44]]],
    ["Weibo Gaming", "XiaoFei", "Controller", [["Omen", 12, 6, 151, 160], ["Viper", 5, 2, 64, 71], ["Astra", 3, 2, 39, 40]]],
    ["Weibo Gaming", "mindfreak", "Controller", [["Omen", 12, 6, 164, 163], ["Viper", 5, 2, 69, 69], ["Astra", 3, 2, 41, 40]]],
    ["Weibo Gaming", "Panda", "Controller", [["Omen", 12, 6, 167, 171], ["Viper", 5, 2, 67, 68], ["Astra", 3, 2, 39, 42]]],
    ["Weibo Gaming", "Yoyo", "Initiator", [["Sova", 12, 6, 165, 163], ["Fade", 5, 2, 74, 71], ["Skye", 3, 2, 43, 43]]],
    ["Weibo Gaming", "AcMe", "Sentinel", [["Cypher", 12, 6, 160, 158], ["Killjoy", 5, 2, 64, 68], ["Vyse", 3, 2, 44, 43]]],
    ["Xi Lai Gaming", "WsLeo", "Initiator · IGL", [["Fade", 12, 7, 170, 166], ["Sova", 7, 4, 98, 96], ["Skye", 4, 2, 55, 54]]],
    ["Xi Lai Gaming", "Lysoar", "Controller", [["Omen", 15, 9, 232, 212], ["Harbor", 4, 2, 61, 55], ["Vyse", 4, 2, 61, 55]]],
    ["Xi Lai Gaming", "NoMan", "Duelist", [["Waylay", 7, 4, 91, 103], ["Raze", 5, 3, 66, 75], ["Jett", 4, 2, 52, 59]]],
    ["Xi Lai Gaming", "Rarga", "Duelist", [["Neon", 5, 3, 81, 76], ["Phoenix", 5, 3, 81, 76], ["Jett", 4, 2, 62, 58]]],
    ["Xi Lai Gaming", "happywei", "Controller", [["Viper", 9, 5, 125, 129], ["Omen", 8, 5, 112, 116], ["Cypher", 6, 4, 83, 86]]],
    ["FNATIC", "Boaster", "Controller · IGL", [["Omen", 15, 6, 164, 233], ["Astra", 2, 1, 22, 31], ["Harbor", 1, 0, 12, 17]]],
    ["FNATIC", "Alfajer", "Duelist", [["Neon", 6, 2, 111, 101], ["Chamber", 5, 2, 94, 85], ["Cypher", 3, 1, 57, 52]]],
    ["FNATIC", "kaajak", "Duelist", [["Neon", 6, 2, 97, 101], ["Yoru", 5, 2, 82, 85], ["Raze", 3, 1, 50, 52]]],
    ["FNATIC", "crashies", "Initiator", [["Fade", 8, 3, 112, 114], ["Viper", 4, 2, 56, 57], ["Cypher", 3, 1, 43, 44]]],
    ["FNATIC", "Veqaj", "Flex", [["Viper", 11, 4, 151, 163], ["Breach", 4, 2, 54, 54], ["Jett", 3, 1, 44, 42]]],
    ["FUT Esports", "MrFaliN", "", [["Omen", 16, 9, 201, 213], ["Viper", 7, 4, 102, 97], ["Astra", 4, 2, 57, 56]]],
    ["FUT Esports", "yetujey", "Sentinel", [["Cypher", 12, 7, 180, 165], ["Viper", 10, 6, 151, 138], ["Astra", 2, 1, 29, 26]]],
    ["FUT Esports", "KROSTALY", "Initiator", [["Sova", 13, 7, 179, 181], ["Skye", 11, 6, 153, 155], ["Fade", 3, 2, 41, 42]]],
    ["FUT Esports", "xeus", "Duelist", [["Waylay", 12, 7, 176, 194], ["Raze", 10, 6, 148, 163], ["Phoenix", 4, 2, 60, 66]]],
    ["FUT Esports", "baha", "", [["Omen", 16, 9, 222, 215], ["Viper", 7, 4, 102, 100], ["Astra", 4, 2, 53, 59]]],
    ["Gentle Mates", "starxo", "Initiator", [["Sova", 9, 3, 118, 134], ["Fade", 7, 2, 92, 105]]],
    ["Gentle Mates", "Minny", "Duelist", [["Neon", 10, 4, 149, 169], ["Jett", 4, 1, 59, 67], ["Waylay", 1, 0, 14, 16]]],
    ["Gentle Mates", "bipo", "Sentinel", [["Cypher", 10, 4, 123, 148], ["Viper", 2, 1, 25, 30]]],
    ["Gentle Mates", "GLYPH", "", [["Omen", 10, 4, 138, 147], ["Viper", 4, 1, 51, 57], ["Astra", 3, 1, 37, 43]]],
    ["Gentle Mates", "marteen", "Duelist", [["Phoenix", 12, 4, 228, 186], ["Raze", 3, 1, 58, 47], ["Yoru", 1, 0, 18, 15]]],
    ["Karmine Corp", "sheydos", "", [["Cypher", 13, 10, 197, 178], ["Killjoy", 5, 4, 74, 71], ["Vyse", 3, 2, 44, 45]]],
    ["Karmine Corp", "dos9", "Controller", [["Omen", 20, 15, 288, 264], ["Harbor", 1, 1, 15, 14]]],
    ["Karmine Corp", "SUYGETSU", "Controller", [["Viper", 13, 10, 167, 179], ["Cypher", 7, 5, 89, 95], ["Astra", 1, 1, 13, 14]]],
    ["Karmine Corp", "LewN", "Duelist", [["Neon", 20, 15, 374, 300], ["Raze", 1, 1, 20, 16]]],
    ["Karmine Corp", "avez", "Initiator", [["Fade", 13, 10, 203, 170], ["Sova", 8, 6, 125, 104]]],
    ["Team Heretics", "Boo", "Controller", [["Omen", 11, 6, 150, 149], ["Astra", 3, 2, 42, 42], ["Fade", 3, 2, 42, 42]]],
    ["Team Heretics", "benjyfishy", "Sentinel", [["Cypher", 9, 5, 122, 126], ["Vyse", 7, 4, 95, 98], ["Sage", 2, 1, 27, 28]]],
    ["Team Heretics", "RieNs", "Initiator", [["Sova", 10, 5, 150, 140], ["Fade", 5, 3, 75, 70], ["Viper", 3, 2, 45, 42]]],
    ["Team Heretics", "Wo0t", "Sentinel", [["Chamber", 6, 3, 101, 85], ["Jett", 4, 2, 67, 57], ["Yoru", 3, 2, 52, 44]]],
    ["Team Heretics", "ComeBack", "", [["Jett", 11, 6, 176, 163], ["Raze", 4, 2, 65, 58], ["Neon", 3, 2, 47, 42]]],
    ["Team Vitality", "Jamppi", "Duelist", [["Phoenix", 13, 7, 205, 206], ["Yoru", 2, 1, 33, 33], ["Fade", 2, 1, 33, 33]]],
    ["Team Vitality", "Derke", "Duelist", [["Jett", 7, 4, 113, 111], ["Neon", 7, 4, 113, 111], ["Raze", 2, 1, 34, 33]]],
    ["Team Vitality", "Sayonara", "Initiator", [["Sova", 10, 5, 166, 127], ["Fade", 7, 4, 116, 88], ["Viper", 2, 1, 34, 26]]],
    ["Team Vitality", "Chronicle", "Sentinel", [["Chamber", 6, 3, 104, 83], ["Vyse", 6, 3, 104, 83], ["Viper", 6, 3, 104, 83]]],
    ["Team Vitality", "PROFEK", "Controller", [["Omen", 12, 6, 158, 169], ["Astra", 4, 2, 53, 56], ["Harbor", 3, 2, 40, 43]]],
    ["FULL SENSE", "Primmie", "Duelist", [["Jett", 6, 2, 103, 84], ["Waylay", 6, 2, 103, 84], ["Deadlock", 5, 2, 87, 71]]],
    ["FULL SENSE", "JitboyS", "Duelist", [["Neon", 10, 4, 151, 154], ["Raze", 8, 3, 119, 121], ["Phoenix", 4, 2, 61, 62]]],
    ["FULL SENSE", "killua", "Initiator", [["Skye", 8, 3, 111, 113], ["Sova", 8, 3, 111, 113], ["Fade", 7, 3, 97, 99]]],
    ["FULL SENSE", "crws", "Controller", [["Omen", 9, 3, 97, 124], ["Astra", 9, 3, 97, 124], ["Harbor", 2, 1, 20, 26]]],
    ["FULL SENSE", "Leviathan", "", [["Cypher", 14, 5, 196, 196], ["Killjoy", 6, 2, 84, 82], ["Vyse", 4, 2, 52, 59]]],
    ["Gen.G", "Lakia", "Initiator · IGL", [["Sova", 187, 108, 2779, 2430], ["Fade", 77, 45, 1047, 1088], ["Skye", 60, 35, 799, 860]]],
    ["Gen.G", "ZynX", "", [["Sova", 11, 6, 151, 146], ["Fade", 5, 3, 64, 74], ["Skye", 3, 2, 43, 41]]],
    ["Gen.G", "t3xture", "Sentinel", [["Chamber", 12, 7, 219, 184], ["Raze", 5, 3, 90, 76], ["Phoenix", 1, 1, 17, 15]]],
    ["Gen.G", "Karon", "Controller", [["Omen", 15, 9, 232, 222], ["Astra", 3, 2, 47, 45], ["Harbor", 1, 1, 15, 14]]],
    ["Gen.G", "Ash", "Duelist", [["Neon", 19, 11, 322, 329]]],
    ["Paper Rex", "f0rsakeN", "Controller", [["Omen", 11, 6, 179, 184], ["Harbor", 3, 2, 50, 51]]],
    ["Paper Rex", "invy", "Initiator", [["Sova", 10, 6, 150, 147], ["Fade", 6, 3, 88, 86], ["Harbor", 1, 1, 16, 16]]],
    ["Paper Rex", "d4v41", "Controller", [["Viper", 9, 5, 150, 131], ["Chamber", 3, 2, 51, 45], ["Sage", 2, 1, 33, 29]]],
    ["Paper Rex", "Jinggg", "Duelist", [["Raze", 8, 4, 127, 139], ["Harbor", 3, 2, 49, 54], ["Waylay", 3, 2, 49, 54]]],
    ["Paper Rex", "something", "Duelist", [["Yoru", 9, 5, 158, 131], ["Sage", 2, 1, 35, 29], ["Viper", 2, 1, 35, 29]]],
    ["Rex Regum Qeon", "crazyguy", "Initiator", [["Sova", 15, 6, 214, 227], ["Fade", 3, 1, 43, 46], ["Sage", 1, 0, 14, 14]]],
    ["Rex Regum Qeon", "Kushy", "Duelist", [["Jett", 11, 4, 165, 154], ["Raze", 5, 2, 76, 74], ["Neon", 3, 1, 49, 40]]],
    ["Rex Regum Qeon", "Monyet", "Controller", [["Omen", 12, 4, 193, 176], ["Astra", 4, 1, 64, 59], ["Harbor", 2, 1, 34, 31]]],
    ["Rex Regum Qeon", "xffero", "Sentinel", [["Cypher", 12, 4, 171, 169], ["Sage", 4, 1, 57, 56], ["Veto", 1, 0, 14, 13]]],
    ["Rex Regum Qeon", "Jemkin", "Duelist", [["Yoru", 5, 2, 75, 73], ["Waylay", 4, 1, 61, 59], ["Chamber", 4, 1, 61, 59]]],
    ["T1", "Munchkin", "Controller", [["Viper", 8, 5, 110, 113], ["Cypher", 6, 4, 81, 83], ["Sova", 5, 3, 70, 72]]],
    ["T1", "carpe", "", [["Cypher", 17, 11, 221, 233], ["Killjoy", 7, 4, 93, 93], ["Vyse", 4, 3, 57, 56]]],
    ["T1", "iZu", "Initiator", [["Sova", 13, 8, 200, 175], ["Fade", 7, 5, 108, 95], ["Neon", 6, 4, 92, 80]]],
    ["T1", "Meteor", "Duelist", [["Yoru", 12, 8, 203, 178], ["Chamber", 11, 7, 189, 166], ["Jett", 4, 3, 69, 61]]],
    ["T1", "stax", "Controller", [["Omen", 16, 10, 222, 201], ["Harbor", 2, 1, 28, 25]]],
    ["T1", "BuZz", "Duelist", [["Neon", 11, 7, 191, 168], ["Phoenix", 5, 3, 88, 78], ["Raze", 4, 3, 70, 61]]],
    ["ZETA DIVISION", "SugarZ3ro", "Controller", [["Omen", 12, 5, 168, 170], ["Viper", 5, 2, 66, 69], ["Astra", 3, 1, 39, 43]]],
    ["ZETA DIVISION", "Xdll", "Sentinel", [["Sage", 9, 4, 125, 139], ["Sova", 7, 3, 97, 108], ["Skye", 3, 1, 42, 46]]],
    ["ZETA DIVISION", "eKo", "Duelist", [["Yoru", 5, 2, 77, 80], ["Fade", 4, 2, 61, 64], ["Sova", 3, 1, 46, 48]]],
    ["ZETA DIVISION", "SyouTa", "Sentinel", [["Cypher", 12, 5, 188, 197], ["Viper", 7, 3, 110, 115], ["Vyse", 1, 0, 16, 16]]],
    ["ZETA DIVISION", "Absol", "Duelist", [["Neon", 18, 7, 290, 307], ["Waylay", 1, 0, 16, 17], ["Yoru", 1, 0, 16, 17]]],
]

# สตาฟฟ์จริงของทีมที่อยู่ใน 21 ทีม
REAL_STAFF = [
    ["Paper Rex", [["alecks", "Alexandre Sallé", "หัวหน้าโค้ช"], ["Wendler", "Ashton Wendler", "ผู้ช่วยโค้ช"], ["Panda", "Laijhun Cheng", "โค้ชสมรรถภาพ"], ["Tommy", "Kumaresan Ramani", "ผู้จัดการทีม"]]],
    ["Rex Regum Qeon", [["Jovi", "Jovanni Vera", "หัวหน้าโค้ช"], ["Warbirds", "Evan Olzem", "ผู้ช่วยโค้ช"], ["Rebecca", "Rebecca Wong", "โค้ชสมรรถภาพ"], ["dave", "David Hunter", "นักวิเคราะห์"], ["Jomengz", "Jonathan Hoo", "สตาฟฟ์"], ["SeasoNz", "Joe Lai", "ผู้จัดการทีม"]]],
    ["FULL SENSE", [["THEELOVEFAMILY", "Thanaphat Limpaphan", "หัวหน้าโค้ช"], ["Sushiboys", "Panyawat Subsiriroj", "ผู้ช่วยโค้ช"]]],
]


# อุปกรณ์จริงของนักแข่ง (prosettings.net, พ.ย. 2026) ลำดับ: จอภาพ, เมาส์, คีย์บอร์ด, หูฟัง, เมาส์แพด  (None = ไม่มีข้อมูล)
GEAR_ORDER = ['จอภาพ', 'เมาส์', 'คีย์บอร์ด', 'หูฟัง', 'เมาส์แพด']
GEAR_BRAND = {"ZOWIE": "BenQ ZOWIE", "Zowie": "BenQ ZOWIE", "Logitech": "Logitech G", "SONY": "Sony", "Fnatic": "Lamzu", "WLMOUSE": "WLMouse", "Custom": "อื่น ๆ"}
REAL_GEAR = {
    'Asuna': ('ZOWIE XL2546K', 'Razer DeathAdder V2', 'Higround Basecamp 65HE', 'Razer BlackShark V3 Pro Black', 'Artisan Ninja FX Zero Soft Black'),
    'Cryocells': ('ZOWIE XL2566X+', 'Ninjutso Sora V2 Black', 'WALLHACK K-001 Natural', 'Razer BlackShark V3 Pro Black', 'Pulsar Meiy Glass'),
    'Timotino': ('ZOWIE XL2586X', 'Logitech G Pro X2 SUPERSTRIKE Lunar Eclipse', 'Wooting 60HE v2 Black', 'Razer BlackShark V3 Pro Black', 'Artisan Ninja FX Zero Soft Black'),
    'bang': ('ZOWIE XL2566X+', 'Logitech G Pro X Superlight Black', 'Wooting 60HE+', 'Razer BlackShark V3 Pro Black', 'Artisan Ninja FX Zero Soft Black'),
    'vora': ('Alienware AW2725DF', 'Ninjutso Sora V3', 'Wooting 80HE Black', None, 'Artisan Type-99 Matcha'),
    'trent': ('ZOWIE XL2566X+', 'Logitech G Pro X Superlight 2c White', 'Wooting 60HE v2 Black', 'HyperX Cloud II', 'X-raypad Aqua Control Zero'),
    'babybay': ('ZOWIE XL2566X+', 'Logitech G Pro X Superlight 2 Dex Black', 'Wooting 60HE v2 Black', 'HyperX Cloud Alpha', 'ZOWIE G-SR III'),
    'leaf': ('ZOWIE XL2566X+', 'Logitech G Pro X Superlight 2c White', 'Logitech G Pro X2 RAPID White', 'HyperX Cloud II', 'X-raypad Equate Plus V2 Kiwami Black'),
    'valyn': ('ZOWIE XL2566K', 'Logitech G Pro X Superlight 2 Cyan', 'Wooting 60HE v2 Black', 'Logitech G PRO X 2 Headset Black', 'Logitech G740'),
    'jawgemo': ('ZOWIE XL2566X+', 'Razer Prototype Mouse (Unreleased)', 'Wooting 60HE+', 'HyperX Cloud II', 'X-raypad Aqua Control+ PORON'),
    'Darker': ('ZOWIE XQ2566X', 'Razer Viper V4 Pro Green', 'IQUNIX EV63 HE', 'HyperX Cloud III', 'Artisan Ninja FX Zero Soft Black'),
    'erde': ('Alienware AW2521HF', 'Logitech G Pro X2 SUPERSTRIKE Lunar Eclipse', 'IQUNIX EV63 HE', 'HyperX Cloud Alpha S Black', 'Artisan FX Hien XSoft Wine Red'),
    'Ethan': ('ZOWIE XL2566K', 'ZOWIE EC3-DW Black', 'ASUS ROG Falchion Ace 75 HE Black', 'ASUS ROG Pelta', 'Zowie Mousepad (Unreleased)'),
    'keiko': ('ZOWIE XL2566X+', 'WLMouse Beast X Max Black', 'Wooting 80HE+ Frost', 'HyperX Cloud II', 'Artisan FX Hien Mid Black'),
    'mada': ('ZOWIE XL2566K', 'Pulsar X2 CrazyLight', 'ASUS ROG Falchion Ace 75 HE Red', 'ASUS ROG Pelta', 'Artisan FX Hien Mid Black'),
    'skuba': ('ZOWIE XL2566K', 'Pulsar X2 CrazyLight', 'Razer Huntsman V3 Pro TKL 8KHz Black', None, 'ZOWIE H-TR'),
    'brawk': ('ZOWIE XL2566K', 'Razer Viper V4 Pro Black', 'ASUS ROG Falchion Ace 75 HE White', 'ASUS ROG Pelta', 'ZOWIE H-SR-SE ROUGE II'),
    'johnqt': ('ZOWIE XL2586X+', 'Logitech G Pro X Superlight 2 Black', 'Wooting 60HE+', 'Razer BlackShark V3 Pro Black', 'Artisan Ninja FX Zero Soft Black'),
    'Reduxx': ('ZOWIE XL2566X+', 'Razer Viper V4 Pro White', 'Razer Huntsman V3 Pro TKL 8KHz Green', 'Razer BlackShark V3 Pro Black', 'Pulsar eS Saturn Pro Black'),
    'cortezia': ('ZOWIE XL2566X+', 'Razer Viper V4 Pro White', 'MelGeek MADE68 Ultra', 'Razer BlackShark V3 Pro Black', 'Custom Mousepad'),
    'JonahP': ('ZOWIE XL2546', 'Razer Viper V4 Pro White', 'Wooting 60HE v2 Black', 'Razer BlackShark V3 Pro Black', 'VAXEE PD150'),
    'Jerrwin': (None, 'Razer Viper V4 Pro Black', 'Wooting 60HE v2 Black', 'Razer BlackShark V3 Pro Black', 'Artisan Ninja FX Zero Soft Black'),
    'ZmjjKK': ('ZOWIE XL2566X+', 'VAXEE NP-01S V3 Pink', 'Wooting 60HE+', 'HyperX Cloud III Wireless', 'Artisan Type-99 Gray'),
    'Smoggy': ('ZOWIE XL2566X+', 'Razer Prototype Mouse (Unreleased)', 'Wooting 60HE v2 Silver', 'Razer BlackShark V3 Pro Green', 'Artisan Type-99 Matcha'),
    'CHICHOO': ('ZOWIE XL2566X+', 'Logitech G Pro X2 SUPERSTRIKE Lunar Eclipse', 'Wooting 60HE+', 'HyperX Cloud II Pink', 'Artisan Ninja FX Zero Mid Orange'),
    'nobody': ('ZOWIE XL2566X+', 'Razer Prototype Mouse (Unreleased)', 'IQUNIX EZ63 HE', 'Razer BlackShark V3 Pro Black', 'VAXEE PD151'),
    'slowly': ('ZOWIE XL2546K', 'Razer DeathAdder V4 Pro White', 'Cherry Xtrfy K5 Pro TMR', 'ASUS ROG Delta II Black', 'Pulsar eS Saturn Pro Black'),
    'splash': ('AOC 24G2Z', 'VAXEE NP-01S V3 Galapagos Green', 'Wooting 80HE Black', 'Razer BlackShark V3 Pro Green', 'VAXEE PE-K GEh Pink'),
    'Scales': ('ZOWIE XL2566K', 'Logitech G Pro X Superlight 2 Magenta', 'Wooting 60HE v2 Black', 'Razer BlackShark V3 Pro Black', 'Artisan Type-99 Soft Black'),
    'Rarga': ('SONY INZONE M10S II', 'Finalmouse Ultralight X Frostlord Medium', 'Wooting 60HE v2 Black', 'Razer BlackShark V3 Pro White', 'Artisan Ninja FX Zero Soft Orange'),
    'happywei': ('SONY INZONE M10S II', 'Logitech G Pro X Superlight 2 Magenta', 'Wooting 60HE+', 'Razer BlackShark V3 Pro Black', 'ZOWIE H-SR-SE BLUE II'),
    'Lysoar': ('SONY INZONE M10S II', 'Razer DeathAdder V4 Pro Black', 'Wooting 80HE Ghost', 'HyperX Cloud III Wireless', 'Artisan Type-99 Soft Black'),
    'Boaster': ('SONY INZONE M10S', 'Fnatic x Lamzu Thorn', 'Sony INZONE KBD-H75', 'SONY INZONE H9 II Black', 'SONY INZONE MAT-F'),
    'Alfajer': ('SONY INZONE M10S', 'Logitech G Pro X3 SUPERSTRIKE Magenta Eclipse', 'Sony INZONE KBD-H75', 'HyperX Cloud II', 'Artisan Ninja FX Zero Soft Orange'),
    'kaajak': ('SONY INZONE M10S', 'Fnatic X Lamzu Maya 8K', 'Sony INZONE KBD-H75', 'SONY INZONE H9 II Black', 'Pulsar eS Saturn Pro Red'),
    'crashies': ('SONY INZONE M10S', 'Lamzu Maya X White', 'Sony INZONE KBD-H75', 'Sennheiser GAME ZERO', 'Artisan Ninja FX Zero Soft Orange'),
    'Veqaj': ('ZOWIE XL2566K', 'Razer Viper V4 Pro White', 'Pulsar PCMK 3', 'Razer BlackShark V3 Pro Black', 'Pulsar eS Saturn Pro Black'),
    'MrFaliN': ('Alienware AW2523HF', 'Logitech G Pro X2 SUPERSTRIKE Lunar Eclipse', 'Wooting 60HE v2 Silver', 'Bose QuietComfort 20', 'VAXEE PC'),
    'yetujey': ('ASUS TUF VG279QM', 'Razer Viper V4 Pro White', 'Wooting 60HE v2 Silver', 'Logitech G Pro X Headset', 'ZOWIE G-SR-SE ROUGE II'),
    'xeus': ('ZOWIE XL2566K', 'Logitech G Pro X Superlight 2 Black', 'Wooting 60HE v2 Silver', 'Logitech G PRO X 2 Headset Black', 'Pulsar eS Jupiter Pro'),
    'starxo': ('ASUS ROG STRIX XG248Q', 'WLMOUSE Beast x Pro Soft Lilac', 'Wooting 80HE Black', 'HyperX Cloud III Wireless Black', 'Artisan Type-99 Soft Black'),
    'Minny': ('ZOWIE XL2566K', 'Razer DeathAdder V4 Pro Black', 'IQUNIX EV63 HE', 'Razer BlackShark V2 Pro Black', 'Artisan Ninja FX Zero Soft Orange'),
    'bipo': ('ZOWIE XL2566K', 'Razer Viper V4 Pro Black', 'IQUNIX EV63 HE', 'Razer BlackShark V2 Pro Black', 'Artisan Ninja FX Zero Soft Orange'),
    'marteen': ('Alienware AW2518H', 'Logitech G Pro X2 SUPERSTRIKE Lunar Eclipse', 'Wooting 60HE+', 'SONY INZONE H9 II', 'Pulsar eS Jupiter Pro'),
    'sheydos': ('ZOWIE XL2546K', 'Razer Viper V4 Pro Black', 'Wooting 60HE v2 Black', 'Razer BlackShark V3 Pro Black', 'Razer Gigantus V2'),
    'dos9': ('LG 25GR75FG', 'Logitech G Pro X Superlight 2 White', 'Wooting 60HE+', 'Razer BlackShark V3 Pro Green', 'Pulsar Meiy Glass'),
    'SUYGETSU': ('LG 25GR75FG', 'Endgame Gear OP1 8k V2 Black', 'WALLHACK K-001 Natural', 'Razer BlackShark V3 Pro Green', 'Artisan Ninja FX Zero Soft Black'),
    'LewN': ('LG 25GR75FG', 'Logitech G Pro X2 SUPERSTRIKE Lunar Eclipse', 'Wooting 60HE v2 Silver', 'Razer BlackShark V3 Pro Green', 'Artisan Ninja FX Zero Soft Orange'),
    'avez': ('LG 25GR75FG', 'Logitech G Pro X Superlight 2 Black', 'Wooting 60HE+', 'Razer BlackShark V3 Pro Green', 'Razer Gigantus V2'),
    'benjyfishy': ('ZOWIE XL2586X+', 'Logitech G Pro X Superlight 2 Magenta', 'Logitech G Pro X TKL RAPID Black', 'Logitech G PRO X 2 Headset Black', 'Gamesense Radar Benjyfishy 2'),
    'RieNs': ('ZOWIE XL2586X+', 'Logitech G Pro X Superlight 2 Cyan', 'Wooting 60HE v2 Silver', None, 'Artisan Ninja FX Zero XSoft Black'),
    'Wo0t': ('ZOWIE XL2586X+', 'Logitech G Pro X2 SUPERSTRIKE Lunar Eclipse', 'Wooting 80HE Ghost', 'Logitech G PRO X 2 Headset Black', 'Logitech G740'),
    'Jamppi': ('Alienware AW2523HF', 'VAXEE E1 Wireless Fluorescent Green', 'ASUS ROG Falchion Ace 75 HE White', 'Logitech G Pro X3 LIGHTSPEED Headset Magenta', 'VAXEE PD150'),
    'Derke': ('ZOWIE XL2566X+', 'Logitech G Pro X3 SUPERSTRIKE Magenta Eclipse', 'ASUS ROG Falcata', 'ASUS ROG Delta II Black', 'Logitech G640 Original'),
    'Sayonara': ('ZOWIE XL2566X+', 'Logitech G Pro X Superlight 2 Magenta', 'ASUS ROG Falchion Ace HFX Black', 'ASUS ROG Delta II Black', 'Pulsar eS Saturn Pro Black'),
    'Chronicle': ('ASUS ROG SWIFT XG27AQM', 'ATK A9 Chronicle Edition', 'ATK x QK Hex80', 'Logitech G Pro X3 LIGHTSPEED Headset Magenta', 'Pulsar Meiy Glass'),
    'PROFEK': ('ZOWIE XL2566K', 'Razer Prototype Mouse (Unreleased)', 'ASUS ROG Falchion Ace 75 HE Black', 'HyperX Cloud III Wireless', 'Artisan Hayate Otsu V2 Soft Black'),
    'Primmie': ('ZOWIE XL2566X+', 'Razer Viper V4 Pro White', 'Wooting 60HE v2 Black', 'HyperX Cloud II', 'Pulsar eS Saturn Pro Red'),
    'JitboyS': ('ZOWIE XL2566K', 'Logitech G Pro X2 SUPERSTRIKE Lunar Eclipse', 'Wooting 80HE+ Frost', 'Razer BlackShark V2 Pro Black', 'Artisan Ninja FX Zero Soft Black'),
    'Lakia': ('ZOWIE XL2546', 'Lamzu Maya X Black', 'SteelSeries Apex Pro TKL Gen 3 Black', 'Razer BlackShark V2 HyperSpeed Black', 'X-raypad Aqua Control+ Wave Black'),
    'ZynX': ('ZOWIE XL2546K', 'Razer Viper V3 Pro White', 'Razer Huntsman V3 Pro Mini', 'Razer BlackShark V2 HyperSpeed Black', 'Pulsar eS Saturn Pro Black'),
    't3xture': ('ZOWIE XL2546K', 'Logitech G Pro X Superlight 2 Cyan', 'SteelSeries Apex Pro TKL Gen 3 White', 'Razer BlackShark V2 HyperSpeed White', 'SteelSeries QcK Heavy Black'),
    'Karon': ('ZOWIE XL2566X+', 'Logitech G Pro X Superlight Magenta', 'Wooting 60HE+', 'Razer BlackShark V2 HyperSpeed White', 'X-raypad Aqua Control+ Wave Black'),
    'f0rsakeN': ('ZOWIE XL2566X+', 'Pulsar Susanto-X', 'Wooting 60HE v2 Silver', 'HyperX Cloud III Wireless', 'Pulsar eS Saturn Pro Red'),
    'invy': ('ZOWIE XL2586X+', 'Logitech G Pro X3 SUPERSTRIKE Magenta Eclipse', 'Wooting 60HE v2 Silver', 'HyperX Cloud III', 'Artisan Ninja FX Zero TenZ'),
    'something': ('ZOWIE XL2586X', 'Logitech G Pro X2 SUPERSTRIKE Lunar Eclipse', 'Pulsar PCMK 3', 'HyperX Cloud III', 'Pulsar eS Saturn Pro Red'),
    'd4v41': ('ZOWIE XL2566X+', 'VAXEE ZYGEN NP-01S V2 Wireless Red', 'Arbiter Studio Polar 65', 'HyperX Cloud III Wireless', 'Pulsar d4v41 Mousepad'),
    'Jinggg': ('ZOWIE XL2566K', 'Pulsar Jinggg-x', 'Wooting 60HE v2 Silver', 'HyperX Cloud III Wireless', 'Artisan Ninja FX Zero Soft Black'),
    'crazyguy': ('ZOWIE XL2566X+', 'Razer Viper V3 Pro Green', 'Wooting 60HE v2 Silver', 'HyperX Cloud III Wireless', 'Pulsar eS Saturn Pro Black'),
    'Kushy': (None, 'Logitech G Pro X2 SUPERSTRIKE Lunar Eclipse', 'Wooting 60HE v2 Silver', None, 'X-raypad Aqua Speed'),
    'Monyet': ('ZOWIE XL2546K', 'VAXEE NP-01S Pink', 'Wooting 80HE+ Frost', 'HyperX Cloud II Pink', 'Pulsar eS Saturn Pro Black'),
    'xffero': (None, 'Logitech G Pro X Superlight 2 White', 'Wooting 80HE Black', 'HyperX Cloud III', 'Artisan Type-99 Matcha'),
    'Jemkin': (None, 'Razer Viper V4 Pro Black', 'Wooting 80HE Black', 'SteelSeries Arctis 7', 'Pulsar eS Saturn Pro Black'),
    'Munchkin': ('ZOWIE XL2546K', 'Razer Viper V4 Pro White', 'Wooting 80HE Ghost', 'Sennheiser GAME ONE', 'X-raypad Aqua Control+ Wave Black'),
    'carpe': ('ZOWIE XL2566K', 'Razer Viper V3 Pro White', 'SteelSeries Apex Pro TKL Gen 3 Black', 'Sennheiser GAME ZERO', 'Pulsar eS Saturn Pro Red'),
    'iZu': ('ZOWIE XL2566K', 'Logitech G Pro X3 SUPERSTRIKE Midnight Black', 'Custom Keyboard', 'Razer BlackShark V3 Pro White', 'Pulsar eS Saturn Pro Black'),
    'Meteor': ('ZOWIE XL2566X+', 'Razer Viper V4 Pro Black', 'Wooting 60HE v2 Silver', 'Logitech G Pro X3 LIGHTSPEED Headset Magenta', 'Artisan Hayate Otsu V2 Soft Wine Red'),
    'stax': ('ZOWIE XL2546S', 'Pulsar STA-X', 'Custom Keyboard', 'Razer BlackShark V3 Pro Black', 'Artisan Hayate Otsu V2 Soft Wine Red'),
    'BuZz': ('ZOWIE XL2546K', 'Pulsar BUZZ-X', 'Custom Keyboard', 'HyperX Cloud III S Wireless White', 'X-raypad Aqua Control+ PORON'),
    'SugarZ3ro': ('SONY INZONE M10S', 'Razer Viper V4 Pro Black', 'Wooting 60HE v2 Black', 'Logitech G Pro X Headset', 'Pulsar eS Saturn Pro Black'),
    'Xdll': ('SONY INZONE M10S', 'Razer Viper V4 Pro White', 'Razer Huntsman V3 Pro TKL Black', 'Razer BlackShark V3 Pro White', 'Pulsar eS Saturn Pro Black'),
    'eKo': (None, 'ZOWIE EC2-CW', 'Logitech G Pro X Keyboard', 'Corsair Void RGB Elite White', 'SteelSeries QcK Heavy Black'),
    'SyouTa': ('ZOWIE XL2566K', 'Logitech G Pro X2 SUPERSTRIKE Lunar Eclipse', 'Razer Huntsman V3 Pro TKL Black', 'Shure SE215 Clear', 'Pulsar eS PD170'),
}
# รูปจริงของแต่ละรุ่น (prosettings.net)
GEAR_IMG = {
    'ZOWIE XL2546K': 'https://prosettings.net/wp-content/uploads/zowie-xl2546k-187x187-fitcontain.png',
    'Razer DeathAdder V2': 'https://prosettings.net/wp-content/uploads/razer-deathadder-v2-187x187-fitcontain.png',
    'Higround Basecamp 65HE': 'https://prosettings.net/wp-content/uploads/Higround-Basecamp-65he-187x187-fitcontain.png',
    'Razer BlackShark V3 Pro Black': 'https://prosettings.net/wp-content/uploads/razer-blackshark-v3-pro-187x187-fitcontain.webp',
    'Artisan Ninja FX Zero Soft Black': 'https://prosettings.net/wp-content/uploads/artisan-ninja-fx-zero-soft-187x187-fitcontain.png',
    'Alienware AW2725DF': 'https://prosettings.net/wp-content/uploads/alienware-aw2725df-187x187-fitcontain.png',
    'Ninjutso Sora V3': 'https://prosettings.net/wp-content/uploads/Ninjutso-Sora-V3-Black-187x187-fitcontain.png',
    'Wooting 80HE Black': 'https://prosettings.net/wp-content/uploads/wooting-80he-187x187-fitcontain.png',
    'Artisan Type-99 Matcha': 'https://prosettings.net/wp-content/uploads/artisan-type-99-matcha-187x187-fitcontain.png',
    'ZOWIE XL2566X+': 'https://prosettings.net/wp-content/uploads/zowie-xl2566x-187x187-fitcontain.png',
    'Ninjutso Sora V2 Black': 'https://prosettings.net/wp-content/uploads/ninjutso-sora-v2-187x187-fitcontain.png',
    'WALLHACK K-001 Natural': 'https://prosettings.net/wp-content/uploads/Wallhack-K-001-187x187-fitcontain.png',
    'Pulsar Meiy Glass': 'https://prosettings.net/wp-content/uploads/Pulsar-Meiy-187x187-fitcontain.png',
    'Logitech G Pro X Superlight Black': 'https://prosettings.net/wp-content/uploads/logitech-g-pro-x-superlight-187x187-fitcontain.png',
    'Wooting 60HE+': 'https://prosettings.net/wp-content/uploads/wooting-60-he-1-187x187-fitcontain.png',
    'Logitech G Pro X Superlight 2c White': 'https://prosettings.net/wp-content/uploads/logitech-g-pro-x-superlight-2c-white-187x187-fitcontain.webp',
    'Wooting 60HE v2 Black': 'https://prosettings.net/wp-content/uploads/wooting-60he-v2-black-187x187-fitcontain.webp',
    'HyperX Cloud II': 'https://prosettings.net/wp-content/uploads/hyperx-cloud-ii-187x187-fitcontain.png',
    'X-raypad Aqua Control Zero': 'https://prosettings.net/wp-content/uploads/x-raypad-aqua-control-zero-187x187-fitcontain.png',
    'Logitech G Pro X Superlight 2 Dex Black': 'https://prosettings.net/wp-content/uploads/logitech-g-pro-x-superlight-2-dex-black-187x187-fitcontain.png',
    'HyperX Cloud Alpha': 'https://prosettings.net/wp-content/uploads/hyperx-cloud-alpha-187x187-fitcontain.png',
    'ZOWIE G-SR III': 'https://prosettings.net/wp-content/uploads/zowie-g-sr-iii-187x187-fitcontain.png',
    'Logitech G Pro X2 RAPID White': 'https://prosettings.net/wp-content/uploads/Logitech-G-pro-X2-Rapid-White-187x187-fitcontain.png',
    'X-raypad Equate Plus V2 Kiwami Black': 'https://prosettings.net/wp-content/uploads/x-raypad-equate-plus-v2-kiwami-187x187-fitcontain.png',
    'ZOWIE XL2566K': 'https://prosettings.net/wp-content/uploads/benq-xl2566k-187x187-fitcontain.png',
    'Logitech G Pro X Superlight 2 Cyan': 'https://prosettings.net/wp-content/uploads/logitech-g-pro-x-superlight-2-cyan-187x187-fitcontain.webp',
    'Logitech G PRO X 2 Headset Black': 'https://prosettings.net/wp-content/uploads/logitech-g-pro-x-2-headset-black-187x187-fitcontain.png',
    'Logitech G740': 'https://prosettings.net/wp-content/uploads/logitech-g740-187x187-fitcontain.png',
    'Alienware AW2521HF': 'https://prosettings.net/wp-content/uploads/alienware-2521hf-187x187-fitcontain.png',
    'Logitech G Pro X2 SUPERSTRIKE Lunar Eclipse': 'https://prosettings.net/wp-content/uploads/logitech-g-pro-x2-superstrike-187x187-fitcontain.webp',
    'IQUNIX EV63 HE': 'https://prosettings.net/wp-content/uploads/iqunix-ev63-187x187-fitcontain.webp',
    'HyperX Cloud Alpha S Black': 'https://prosettings.net/wp-content/uploads/hyperx-cloud-alpha-s-187x187-fitcontain.png',
    'Artisan FX Hien XSoft Wine Red': 'https://prosettings.net/wp-content/uploads/artisan-fx-hien-xsoft-wine-red-187x187-fitcontain.png',
    'ZOWIE XQ2566X': 'https://prosettings.net/wp-content/uploads/ZOWIE-XQ2566X-187x187-fitcontain.png',
    'Razer Viper V4 Pro Green': 'https://prosettings.net/wp-content/uploads/Razer-Viper-V4-Pro-Green-187x187-fitcontain.png',
    'HyperX Cloud III': 'https://prosettings.net/wp-content/uploads/hyperx-cloud-iii-187x187-fitcontain.png',
    'Razer Viper V4 Pro Black': 'https://prosettings.net/wp-content/uploads/razer-viper-v4-pro-187x187-fitcontain.webp',
    'Razer Gigantus V2': 'https://prosettings.net/wp-content/uploads/razer-gigantus-v2-187x187-fitcontain.png',
    'ZOWIE EC3-DW Black': 'https://prosettings.net/wp-content/uploads/zowie-ec3-cw-187x187-fitcontain.png',
    'ASUS ROG Falchion Ace 75 HE Black': 'https://prosettings.net/wp-content/uploads/asus-rog-falchion-ace-75-he-black-187x187-fitcontain.webp',
    'ASUS ROG Pelta': 'https://prosettings.net/wp-content/uploads/asus-rog-pelta-187x187-fitcontain.png',
    'Zowie Mousepad (Unreleased)': 'https://prosettings.net/wp-content/uploads/zowie-187x187-fitcontain.png',
    'WLMouse Beast X Max Black': 'https://prosettings.net/wp-content/uploads/wlmouse-beast-x-black-187x187-fitcontain.png',
    'Wooting 80HE+ Frost': 'https://prosettings.net/wp-content/uploads/wooting-80he-frost-187x187-fitcontain.png',
    'Artisan FX Hien Mid Black': 'https://prosettings.net/wp-content/uploads/artisan-hien-fx-soft-187x187-fitcontain.png',
    'Pulsar X2 CrazyLight': 'https://prosettings.net/wp-content/uploads/pulsar-x2-crazylight-187x187-fitcontain.webp',
    'Razer Huntsman V3 Pro TKL 8KHz Black': 'https://prosettings.net/wp-content/uploads/razer-huntsman-v3-pro-tkl-187x187-fitcontain.png',
    'ZOWIE H-TR': 'https://prosettings.net/wp-content/uploads/zowie-h-tr-187x187-fitcontain.png',
    'ASUS ROG Falchion Ace 75 HE Red': 'https://prosettings.net/wp-content/uploads/ASUS-ROG-Falchion-Ace-75-HE-Red-187x187-fitcontain.png',
    'ASUS ROG Falchion Ace 75 HE White': 'https://prosettings.net/wp-content/uploads/asus-rog-falchion-ace-75-he-white-187x187-fitcontain.webp',
    'ZOWIE H-SR-SE ROUGE II': 'https://prosettings.net/wp-content/uploads/zowie-h-sr-se-rouge-ii-187x187-fitcontain.png',
    'Razer Viper V4 Pro White': 'https://prosettings.net/wp-content/uploads/razer-viper-v4-pro-white-187x187-fitcontain.webp',
    'MelGeek MADE68 Ultra': 'https://prosettings.net/wp-content/uploads/melgeek-made68-ultra-red-187x187-fitcontain.webp',
    'Custom Mousepad': 'https://prosettings.net/wp-content/uploads/custom-mousepad-187x187-fitcontain.png',
    'Razer Huntsman V3 Pro TKL 8KHz Green': 'https://prosettings.net/wp-content/uploads/razer-huntsman-v3-pro-tkl-green-187x187-fitcontain.webp',
    'Pulsar eS Saturn Pro Black': 'https://prosettings.net/wp-content/uploads/pulsar-es-saturn-pro-v2-187x187-fitcontain.webp',
    'ZOWIE XL2546': 'https://prosettings.net/wp-content/uploads/zowie-xl2546-187x187-fitcontain.png',
    'VAXEE PD150': 'https://prosettings.net/wp-content/uploads/vaxee-pd-187x187-fitcontain.png',
    'Logitech G Pro X Superlight 2 Black': 'https://prosettings.net/wp-content/uploads/logitech-g-pro-x-superlight-187x187-fitcontain.png',
    'ZOWIE XL2586X+': 'https://prosettings.net/wp-content/uploads/zowie-xl2586x-1-187x187-fitcontain.png',
    'VAXEE NP-01S V3 Pink': 'https://prosettings.net/wp-content/uploads/VAXEE-NP-01S-V3-Pink-187x187-fitcontain.png',
    'HyperX Cloud III Wireless': 'https://prosettings.net/wp-content/uploads/hyperx-cloud-iii-wireless-187x187-fitcontain.png',
    'Artisan Type-99 Gray': 'https://prosettings.net/wp-content/uploads/artisan-type-99-grey-187x187-fitcontain.webp',
    'AOC 24G2Z': 'https://prosettings.net/wp-content/uploads/aoc-24g2z-187x187-fitcontain.png',
    'VAXEE NP-01S V3 Galapagos Green': 'https://prosettings.net/wp-content/uploads/VAXEE-NP-01S-V3-Galapagos-Green-187x187-fitcontain.png',
    'Razer BlackShark V3 Pro Green': 'https://prosettings.net/wp-content/uploads/razer-blackshark-v3-pro-green-187x187-fitcontain.webp',
    'VAXEE PE-K GEh Pink': 'https://prosettings.net/wp-content/uploads/vaxee-pe-k-pink-187x187-fitcontain.webp',
    'SONY INZONE M10S II': 'https://prosettings.net/wp-content/uploads/SONY-INZONE-M10S-II-187x187-fitcontain.png',
    'Finalmouse Ultralight X Frostlord Medium': 'https://prosettings.net/wp-content/uploads/Finalmouse-Ultralight-X-Frostlord-187x187-fitcontain.png',
    'Razer BlackShark V3 Pro White': 'https://prosettings.net/wp-content/uploads/razer-blackshark-v3-pro-white-187x187-fitcontain.webp',
    'Artisan Ninja FX Zero Soft Orange': 'https://prosettings.net/wp-content/uploads/artisan-ninja-fx-zero-xsoft-orange-187x187-fitcontain.png',
    'ASUS TUF VG279QM': 'https://prosettings.net/wp-content/uploads/asus-tuf-vg279qm-187x187-fitcontain.png',
    'Wooting 60HE v2 Silver': 'https://prosettings.net/wp-content/uploads/wooting-60he-v2-silver-regular-187x187-fitcontain.webp',
    'Logitech G Pro X Headset': 'https://prosettings.net/wp-content/uploads/logitech-g-pro-x-wired-187x187-fitcontain.png',
    'ZOWIE G-SR-SE ROUGE II': 'https://prosettings.net/wp-content/uploads/zowie-g-sr-se-rouge-ii-187x187-fitcontain.png',
    'ASUS ROG STRIX XG248Q': 'https://prosettings.net/wp-content/uploads/asus-rog-strix-xg248q-187x187-fitcontain.png',
    'WLMOUSE Beast x Pro Soft Lilac': 'https://prosettings.net/wp-content/uploads/wlmouse-beast-x-pro-soft-lilac-187x187-fitcontain.webp',
    'HyperX Cloud III Wireless Black': 'https://prosettings.net/wp-content/uploads/hyperx-cloud-iii-wireless-black-187x187-fitcontain.png',
    'Artisan Type-99 Soft Black': 'https://prosettings.net/wp-content/uploads/artisan-type-99-black-187x187-fitcontain.png',
    'Logitech G Pro X3 SUPERSTRIKE Magenta Eclipse': 'https://prosettings.net/wp-content/uploads/Logitech-G-Pro-X3-SUPERSTRIKE-Magenta-187x187-fitcontain.png',
    'ASUS ROG Falcata': 'https://prosettings.net/wp-content/uploads/asus-rog-falcata-187x187-fitcontain.webp',
    'ASUS ROG Delta II Black': 'https://prosettings.net/wp-content/uploads/asus-rog-delta-ii-187x187-fitcontain.png',
    'Logitech G640 Original': 'https://prosettings.net/wp-content/uploads/logitech-g640-187x187-fitcontain.png',
    'ASUS ROG SWIFT XG27AQM': 'https://prosettings.net/wp-content/uploads/asus-rog-swift-xg27aqm-187x187-fitcontain.png',
    'ATK A9 Chronicle Edition': 'https://prosettings.net/cdn-cgi/image/dpr=1%2Cf=auto%2Cfit=contain%2Cheight=187%2Cq=85%2Cwidth=187/wp-content/uploads/ATK-A9-Chronicle.png',
    'ATK x QK Hex80': 'https://prosettings.net/wp-content/uploads/ATK-x-QK-Hex80-187x187-fitcontain.png',
    'Logitech G Pro X3 LIGHTSPEED Headset Magenta': 'https://prosettings.net/wp-content/uploads/G-Pro-X3-Lightspeed-Headset-Magenta-187x187-fitcontain.png',
    'Lamzu Maya X Black': 'https://prosettings.net/wp-content/uploads/lamzu-maya-x-black-187x187-fitcontain.png',
    'SteelSeries Apex Pro TKL Gen 3 Black': 'https://prosettings.net/wp-content/uploads/steelseries-apex-pro-tkl-gen-3-187x187-fitcontain.png',
    'Razer BlackShark V2 HyperSpeed Black': 'https://prosettings.net/wp-content/uploads/razer-blackshark-v2-hyperspeed-187x187-fitcontain.png',
    'X-raypad Aqua Control+ Wave Black': 'https://prosettings.net/wp-content/uploads/x-raypad-aqua-control-wave-black-187x187-fitcontain.png',
    'VAXEE ZYGEN NP-01S V2 Wireless Red': 'https://prosettings.net/wp-content/uploads/vaxee-np-01s-v2-wireless-red-187x187-fitcontain.webp',
    'Arbiter Studio Polar 65': 'https://prosettings.net/wp-content/uploads/arbiter-studio-polar-65-187x187-fitcontain.png',
    'Pulsar d4v41 Mousepad': 'https://prosettings.net/wp-content/uploads/Pulsar-d4v41-187x187-fitcontain.png',
    'ZOWIE XL2546S': 'https://prosettings.net/wp-content/uploads/zowie-xl2546s-187x187-fitcontain.png',
    'Pulsar STA-X': 'https://prosettings.net/wp-content/uploads/Pulsar-STA-X-187x187-fitcontain.png',
    'Custom Keyboard': 'https://prosettings.net/wp-content/uploads/custom-keyboard-187x187-fitcontain.png',
    'Artisan Hayate Otsu V2 Soft Wine Red': 'https://prosettings.net/wp-content/uploads/artisan-hayate-otsu-mid-187x187-fitcontain.png',
    'Pulsar Jinggg-x': 'https://prosettings.net/wp-content/uploads/Pulsar-Jingg-X-187x187-fitcontain.png',
    'Alienware AW2518H': 'https://prosettings.net/wp-content/uploads/alienware-aw2518h-187x187-fitcontain.png',
    'SONY INZONE H9 II': 'https://prosettings.net/wp-content/uploads/sony-inzone-h9-ii-187x187-fitcontain.webp',
    'SONY INZONE H9 II Black': 'https://prosettings.net/wp-content/uploads/sony-inzone-h9-ii-187x187-fitcontain.webp',
    'Pulsar eS Jupiter Pro': 'https://prosettings.net/wp-content/uploads/Pulsar-eS-Jupiter-Pro-Gear-Img-187x187-fitcontain.png',
    'Logitech G Pro X Superlight 2 Magenta': 'https://prosettings.net/wp-content/uploads/logitech-g-pro-x-superlight-magenta-187x187-fitcontain.png',
    'Logitech G Pro X TKL RAPID Black': 'https://prosettings.net/wp-content/uploads/logitech-g-pro-x-tkl-rapid-black-187x187-fitcontain.png',
    'Gamesense Radar Benjyfishy 2': 'https://prosettings.net/wp-content/uploads/Gamesense-Radar-Benjyfishy-2-187x187-fitcontain.png',
    'ZOWIE XL2586X': 'https://prosettings.net/wp-content/uploads/zowie-xl2586x-187x187-fitcontain.png',
    'Pulsar PCMK 3': 'https://prosettings.net/wp-content/uploads/pulsar-pcmk-3-he-60-187x187-fitcontain.webp',
    'Pulsar eS Saturn Pro Red': 'https://prosettings.net/wp-content/uploads/pulsar-es-saturn-pro-red-xl-sq-187x187-fitcontain.webp',
    'Pulsar BUZZ-X': 'https://prosettings.net/wp-content/uploads/Pulsar-Buzz-X-187x187-fitcontain.png',
    'HyperX Cloud III S Wireless White': 'https://prosettings.net/wp-content/uploads/HyperX-Cloud-III-S-Wireless-White-187x187-fitcontain.png',
    'X-raypad Aqua Control+ PORON': 'https://prosettings.net/wp-content/uploads/x-raypad-aqua-control-poron-187x187-fitcontain.webp',
    'Razer Prototype Mouse (Unreleased)': 'https://prosettings.net/wp-content/uploads/razer-187x187-fitcontain.png',
    'IQUNIX EZ63 HE': 'https://prosettings.net/wp-content/uploads/iqunix-ez63-187x187-fitcontain.webp',
    'VAXEE PD151': 'https://prosettings.net/wp-content/uploads/vaxee-pd151-187x187-fitcontain.webp',
    'HyperX Cloud II Pink': 'https://prosettings.net/wp-content/uploads/hyperx-cloud-ii-pink-187x187-fitcontain.png',
    'Artisan Ninja FX Zero Mid Orange': 'https://prosettings.net/wp-content/uploads/artisan-ninja-fx-zero-xsoft-orange-187x187-fitcontain.png',
    'Razer DeathAdder V4 Pro White': 'https://prosettings.net/wp-content/uploads/razer-deathadder-v4-pro-white-187x187-fitcontain.webp',
    'Cherry Xtrfy K5 Pro TMR': 'https://prosettings.net/wp-content/uploads/cherry-xtrfy-k5-pro-tmr-187x187-fitcontain.webp',
    'Razer DeathAdder V4 Pro Black': 'https://prosettings.net/wp-content/uploads/razer-deathadder-v4-pro-black-187x187-fitcontain.webp',
    'Wooting 80HE Ghost': 'https://prosettings.net/wp-content/uploads/wooting-80he-ghost-187x187-fitcontain.png',
    'SONY INZONE M10S': 'https://prosettings.net/wp-content/uploads/sony-inzone-m10s-187x187-fitcontain.png',
    'Lamzu Maya X White': 'https://prosettings.net/wp-content/uploads/lamzu-maya-x-white-187x187-fitcontain.png',
    'Sony INZONE KBD-H75': 'https://prosettings.net/wp-content/uploads/sony-inzone-kbd-h75-187x187-fitcontain.webp',
    'Sennheiser GAME ZERO': 'https://prosettings.net/wp-content/uploads/sennheiser-game-zero-187x187-fitcontain.png',
    'Fnatic X Lamzu Maya 8K': 'https://prosettings.net/wp-content/uploads/lamzu-x-fnatic-maya-8k-187x187-fitcontain.png',
    'LG 25GR75FG': 'https://prosettings.net/wp-content/uploads/lg-25gr75fg-187x187-fitcontain.webp',
    'Logitech G Pro X Superlight 2 White': 'https://prosettings.net/wp-content/uploads/logitech-g-pro-x-superlight-white-187x187-fitcontain.png',
    'Endgame Gear OP1 8k V2 Black': 'https://prosettings.net/wp-content/uploads/endgame-gear-op1-8k-black-187x187-fitcontain.png',
    'Razer Viper V3 Pro White': 'https://prosettings.net/wp-content/uploads/viper-v3-pro-white-187x187-fitcontain.png',
    'Razer Huntsman V3 Pro Mini': 'https://prosettings.net/wp-content/uploads/razer-huntsman-v3-pro-mini-187x187-fitcontain.png',
    'SteelSeries Apex Pro TKL Gen 3 White': 'https://prosettings.net/wp-content/uploads/steelseries-apex-pro-tkl-gen-3-white-187x187-fitcontain.png',
    'Razer BlackShark V2 HyperSpeed White': 'https://prosettings.net/wp-content/uploads/Razer-BlackShark-V2-HyperSpeed-White-187x187-fitcontain.png',
    'SteelSeries QcK Heavy Black': 'https://prosettings.net/wp-content/uploads/steelseries-qck-heavy-187x187-fitcontain.png',
    'Pulsar Susanto-X': 'https://prosettings.net/wp-content/uploads/pulsar-susanto-x-187x187-fitcontain.webp',
    'Artisan Ninja FX Zero TenZ': 'https://prosettings.net/wp-content/uploads/Artisan-Zero-TenZ-Signature-187x187-fitcontain.png',
    'Alienware AW2523HF': 'https://prosettings.net/wp-content/uploads/alienware-aw2523hf-187x187-fitcontain.png',
    'VAXEE PC': 'https://prosettings.net/wp-content/uploads/vaxee-pc-187x187-fitcontain.png',
    'Bose QuietComfort 20': 'https://prosettings.net/wp-content/uploads/bose-quietcomfort-20-187x187-fitcontain.png',
    'Razer Huntsman V3 Pro TKL Black': 'https://prosettings.net/wp-content/uploads/razer-huntsman-v3-pro-tkl-187x187-fitcontain.png',
    'Pulsar eS PD170': 'https://prosettings.net/wp-content/uploads/pulsar-es-pd170-187x187-fitcontain.webp',
    'Shure SE215 Clear': 'https://prosettings.net/wp-content/uploads/shure-se215-187x187-fitcontain.png',
    'Razer Viper V3 Pro Green': 'https://prosettings.net/wp-content/uploads/razer-viper-v3-pro-green-187x187-fitcontain.webp',
    'Razer BlackShark V2 Pro Black': 'https://prosettings.net/wp-content/uploads/razer-blackshark-v2-pro-2023-187x187-fitcontain.png',
    'ASUS ROG Falchion Ace HFX Black': 'https://prosettings.net/wp-content/uploads/asus-rog-falchion-ace-hfx-187x187-fitcontain.png',
    'Artisan Hayate Otsu V2 Soft Black': 'https://prosettings.net/wp-content/uploads/artisan-hayate-otsu-187x187-fitcontain.png',
    'Artisan Ninja FX Zero XSoft Black': 'https://prosettings.net/wp-content/uploads/artisan-ninja-fx-zero-xsoft-187x187-fitcontain.png',
    'Logitech G Pro X Superlight Magenta': 'https://prosettings.net/wp-content/uploads/logitech-g-pro-x-superlight-magenta-187x187-fitcontain.png',
    'Logitech G Pro X3 SUPERSTRIKE Midnight Black': 'https://prosettings.net/wp-content/uploads/Logitech-G-Pro-X3-SUPERSTRIKE-187x187-fitcontain.png',
    'Sennheiser GAME ONE': 'https://prosettings.net/wp-content/uploads/sennheiser-game-one-187x187-fitcontain.png',
    'SteelSeries Arctis 7': 'https://prosettings.net/wp-content/uploads/steelseries-arctis-7-187x187-fitcontain.png',
    'VAXEE E1 Wireless Fluorescent Green': 'https://prosettings.net/wp-content/uploads/vaxee-e1-wireless-fluorescent-green-187x187-fitcontain.webp',
    'VAXEE NP-01S Pink': 'https://prosettings.net/wp-content/uploads/vaxee-np-01s-pink-187x187-fitcontain.png',
    'X-raypad Aqua Speed': 'https://prosettings.net/cdn-cgi/image/dpr=1%2Cf=auto%2Cfit=contain%2Cheight=187%2Cq=85%2Cwidth=187/wp-content/uploads/X-Raypad-Aqua-Speed.png',
    'ZOWIE H-SR-SE BLUE II': 'https://prosettings.net/wp-content/uploads/zowie-g-sr-se-blue-ii-187x187-fitcontain.webp',
    'ZOWIE EC2-CW': 'https://prosettings.net/wp-content/uploads/zowie-ec2-cw-187x187-fitcontain.png',
}
GEAR_IMG_N = {norm(k): v for k, v in GEAR_IMG.items()}
REAL_GEAR_N = {norm(k): v for k, v in REAL_GEAR.items()}


def gear_brand(name):
    w = name.split()[0]
    return GEAR_BRAND.get(w, w)



def build_seed():
    team_id = {n: f"v{i}" for i, (n, _) in enumerate(SEED_TEAMS)}
    teams = [{"id": team_id[n], "name": n, "game": "VALORANT", "region": "VCT " + lg, "coach": "", "logo": ""}
             for n, lg in SEED_TEAMS]

    players = []
    for team, name, role, stats in SEED_PLAYERS:
        players.append({"id": f"vp{len(players)}", "name": name, "real": "", "team": team_id[team], "role": role,
                        "price": 0, "photo": "",
                        "agents": [{"n": a, "g": g, "w": w, "k": k, "d": d} for a, g, w, k, d in stats]})

    staff = []
    for team, ps in REAL_STAFF:
        for n, r, ro in ps:
            staff.append({"id": f"vs{len(staff)}", "name": n, "real": r, "team": team_id[team], "role": ro})

    gear = []  # อุปกรณ์จริงจะถูกใส่ให้นักแข่งอัตโนมัติใน sync_seed (ดู REAL_GEAR)

    lib, seen = [], set()
    for g in gear:
        k = norm(g["name"])
        if k not in seen:
            seen.add(k)
            lib.append({"id": f"l{len(lib)}", "name": g["name"], "brand": g["brand"], "type": g["type"], "img": ""})

    tours = []
    results = []

    # ลำดับนี้สำคัญ: ตารางที่ถูกอ้างอิงต้องมาก่อน
    return {"teams": teams, "tours": tours, "players": players, "staff": staff, "lib": lib, "gear": gear, "results": results}


# =====================================================================
# ฐานข้อมูล
# =====================================================================
GEAR_TYPES = "เมาส์|คีย์บอร์ด|หูฟัง|จอภาพ|เก้าอี้|คอมพิวเตอร์|เมาส์แพด|อื่น ๆ"
STAFF_ROLES = "หัวหน้าโค้ช|โค้ช|ผู้ช่วยโค้ช|โค้ชสมรรถภาพ|ผู้จัดการทีม|นักวิเคราะห์|สตาฟฟ์"

# ฟิลด์ของแต่ละตาราง (ตรงกับตัวแปร E ในฝั่งเว็บ)
FIELDS = {
    "teams":   [("name", "text"), ("game", "text"), ("region", "text"), ("coach", "text"), ("logo", "img")],
    "players": [("name", "text"), ("real", "text"), ("team", "ref:teams"), ("role", "text"), ("price", "num"), ("photo", "img"), ("agents", "agents")],
    "staff":   [("name", "text"), ("real", "text"), ("team", "ref:teams"), ("role", "sel:" + STAFF_ROLES)],
    "gear":    [("name", "text"), ("brand", "text"), ("type", "sel:" + GEAR_TYPES), ("owner", "ref:players"),
                ("status", "sel:พร้อมใช้|ส่งซ่อม|สูญหาย"), ("cost", "num"), ("bought", "date"),
                ("serial", "text"), ("note", "longtext"), ("img", "img")],
    "lib":     [("name", "text"), ("brand", "text"), ("type", "sel:" + GEAR_TYPES), ("img", "img")],
    "tours":   [("name", "text"), ("game", "text"), ("start", "date"), ("place", "text"), ("prize", "num")],
    "results": [("tour", "ref:tours"), ("date", "date"), ("a", "ref:teams"), ("b", "ref:teams"), ("sa", "int"), ("sb", "int")],
}
STATE_ORDER = ["teams", "players", "staff", "gear", "lib", "tours", "results"]

SCHEMA = """
CREATE TABLE IF NOT EXISTS meta(key TEXT PRIMARY KEY, value TEXT);

CREATE TABLE IF NOT EXISTS teams(
  id TEXT PRIMARY KEY, name TEXT NOT NULL, game TEXT NOT NULL DEFAULT '',
  region TEXT NOT NULL DEFAULT '', coach TEXT NOT NULL DEFAULT '', logo TEXT NOT NULL DEFAULT '');

CREATE TABLE IF NOT EXISTS tours(
  id TEXT PRIMARY KEY, name TEXT NOT NULL, game TEXT NOT NULL DEFAULT '',
  "start" TEXT NOT NULL DEFAULT '', place TEXT NOT NULL DEFAULT '', prize REAL NOT NULL DEFAULT 0);

CREATE TABLE IF NOT EXISTS players(
  id TEXT PRIMARY KEY, name TEXT NOT NULL, "real" TEXT NOT NULL DEFAULT '',
  team TEXT REFERENCES teams(id) ON DELETE SET NULL,
  role TEXT NOT NULL DEFAULT '', price REAL NOT NULL DEFAULT 0, photo TEXT NOT NULL DEFAULT '');

CREATE TABLE IF NOT EXISTS player_agents(
  player_id TEXT NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  pos INTEGER NOT NULL, agent TEXT NOT NULL,
  games INTEGER NOT NULL DEFAULT 0, wins INTEGER NOT NULL DEFAULT 0,
  kills INTEGER NOT NULL DEFAULT 0, deaths INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(player_id, pos));

CREATE TABLE IF NOT EXISTS staff(
  id TEXT PRIMARY KEY, name TEXT NOT NULL, "real" TEXT NOT NULL DEFAULT '',
  team TEXT REFERENCES teams(id) ON DELETE SET NULL, role TEXT NOT NULL DEFAULT '');

CREATE TABLE IF NOT EXISTS lib(
  id TEXT PRIMARY KEY, name TEXT NOT NULL, brand TEXT NOT NULL DEFAULT '',
  type TEXT NOT NULL DEFAULT '', img TEXT NOT NULL DEFAULT '');

CREATE TABLE IF NOT EXISTS gear(
  id TEXT PRIMARY KEY, name TEXT NOT NULL, brand TEXT NOT NULL DEFAULT '', type TEXT NOT NULL DEFAULT '',
  owner TEXT REFERENCES players(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'พร้อมใช้', cost REAL NOT NULL DEFAULT 0, bought TEXT NOT NULL DEFAULT '',
  serial TEXT NOT NULL DEFAULT '', note TEXT NOT NULL DEFAULT '', img TEXT NOT NULL DEFAULT '');

CREATE TABLE IF NOT EXISTS results(
  id TEXT PRIMARY KEY,
  tour TEXT NOT NULL REFERENCES tours(id) ON DELETE CASCADE,
  "date" TEXT NOT NULL,
  a TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  b TEXT NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  sa INTEGER NOT NULL DEFAULT 0, sb INTEGER NOT NULL DEFAULT 0,
  CHECK(a <> b));

CREATE INDEX IF NOT EXISTS idx_players_team ON players(team);
CREATE INDEX IF NOT EXISTS idx_staff_team ON staff(team);
CREATE INDEX IF NOT EXISTS idx_gear_owner ON gear(owner);
CREATE INDEX IF NOT EXISTS idx_results_tour ON results(tour);
CREATE INDEX IF NOT EXISTS idx_results_a ON results(a);
CREATE INDEX IF NOT EXISTS idx_results_b ON results(b);
"""

write_lock = threading.Lock()
tokens = {}          # token -> เวลาหมดอายุ
tokens_lock = threading.Lock()


class BadRequest(Exception):
    pass


def q(name):
    return '"' + name + '"'


def connect():
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def new_id():
    return secrets.token_hex(6)


def as_number(v):
    return int(v) if isinstance(v, float) and v.is_integer() else v


# ---------- อ่านข้อมูล ----------
def load_state(conn):
    state = {}
    for ent in STATE_ORDER:
        cols = ["id"] + [f for f, k in FIELDS[ent] if k != "agents"]
        rows = []
        for r in conn.execute(f"SELECT {','.join(q(c) for c in cols)} FROM {ent} ORDER BY rowid"):
            d = dict(zip(cols, r))
            for f, kind in FIELDS[ent]:
                if kind.startswith("ref:") and d.get(f) is None:
                    d[f] = ""
                elif kind in ("num", "int"):
                    d[f] = as_number(d[f])
            rows.append(d)
        state[ent] = rows
    agents = {}
    for pid, agent, g, w, k, d in conn.execute(
            "SELECT player_id, agent, games, wins, kills, deaths FROM player_agents ORDER BY player_id, pos"):
        agents.setdefault(pid, []).append({"n": agent, "g": g, "w": w, "k": k, "d": d})
    for p in state["players"]:
        p["agents"] = agents.get(p["id"], [])
    return state


# ---------- ตรวจสอบข้อมูลที่ส่งเข้ามา ----------
def clean_agents(v):
    if not isinstance(v, list):
        raise BadRequest("รูปแบบสถิติตัวละครไม่ถูกต้อง")
    out = []
    for a in v[:50]:
        if not isinstance(a, dict) or not str(a.get("n", "")).strip():
            raise BadRequest("รูปแบบสถิติตัวละครไม่ถูกต้อง")
        nums = {}
        for key in "gwkd":
            x = a.get(key, 0)
            if isinstance(x, bool) or not isinstance(x, int) or x < 0:
                raise BadRequest("สถิติตัวละครต้องเป็นจำนวนเต็มตั้งแต่ 0")
            nums[key] = x
        if nums["w"] > nums["g"]:
            raise BadRequest("จำนวนชนะต้องไม่เกินจำนวนเกม")
        out.append({"n": str(a["n"]).strip()[:40], **nums})
    return out


def clean(ent, obj):
    if not isinstance(obj, dict):
        raise BadRequest("ข้อมูลไม่ถูกต้อง")
    rec = {"id": str(obj.get("id") or "").strip()[:64] or new_id()}
    for f, kind in FIELDS[ent]:
        v = obj.get(f)
        if kind == "agents":
            rec[f] = clean_agents(v if v is not None else [])
        elif kind in ("num", "int"):
            try:
                x = float(v if v not in (None, "") else 0)
            except (TypeError, ValueError):
                raise BadRequest(f"ช่อง {f} ต้องเป็นตัวเลข")
            if not math.isfinite(x) or x < 0:
                raise BadRequest(f"ช่อง {f} ต้องเป็นตัวเลขตั้งแต่ 0")
            if kind == "int":
                if not x.is_integer():
                    raise BadRequest("คะแนนต้องเป็นจำนวนเต็ม")
                x = int(x)
            rec[f] = x
        elif kind.startswith("ref:"):
            rec[f] = str(v or "").strip() or None
        elif kind.startswith("sel:"):
            opts = kind[4:].split("|")
            s = str(v or "").strip() or opts[0]
            if s not in opts:
                raise BadRequest(f"ค่าของช่อง {f} ไม่อยู่ในตัวเลือก")
            rec[f] = s
        elif kind == "date":
            s = str(v or "").strip()
            if s:
                try:
                    dt.date.fromisoformat(s)
                except ValueError:
                    raise BadRequest("รูปแบบวันที่ไม่ถูกต้อง")
            rec[f] = s
        elif kind == "img":
            s = str(v or "").strip()
            if s and not (s.startswith("data:image/") or s.startswith("https://") or s.startswith("http://")):
                raise BadRequest("รูปภาพไม่ถูกต้อง")
            if len(s) > MAX_IMG:
                raise BadRequest("รูปภาพมีขนาดใหญ่เกินไป")
            rec[f] = s
        else:
            rec[f] = str(v if v is not None else "").strip()[:2000 if kind == "longtext" else 300]

    if ent == "results":
        if not rec["tour"] or not rec["a"] or not rec["b"]:
            raise BadRequest("กรุณาเลือกรายการแข่งและทีมทั้งสองฝั่ง")
        if rec["a"] == rec["b"]:
            raise BadRequest("ทีม A และทีม B ต้องไม่ใช่ทีมเดียวกัน")
        if not rec["date"]:
            raise BadRequest("กรุณาเลือกวันที่แข่ง")
    elif not rec["name"]:
        raise BadRequest("กรุณากรอกชื่อ")
    return rec


# ---------- เขียนข้อมูล ----------
def upsert(conn, ent, rec, seeding=False):
    if ent == "results" and not seeding:
        row = conn.execute("SELECT start FROM tours WHERE id=?", (rec.get("tour"),)).fetchone()
        y = (row[0] or "")[:4] if row else ""
        if y and rec.get("date") and rec["date"][:4] != y:
            raise BadRequest(f"วันที่แข่งต้องอยู่ในปี {y} ตามรายการที่แข่ง")
    if ent == "results" and not seeding:
        ids = [rec.get("tour")]
        old = conn.execute("SELECT tour FROM results WHERE id=?", (rec.get("id"),)).fetchone()
        if old:
            ids.append(old[0])
        if any(is_real_tour(conn, t) for t in ids):
            raise BadRequest("ผลของ VALORANT Champions เป็นข้อมูลจริงจากระบบ เพิ่มหรือแก้ไขเองไม่ได้")
    if ent in ("lib", "gear") and not rec.get("img"):
        rec["img"] = GEAR_IMG_N.get(norm(rec.get("name", "")), "")
    cols = [c for c in rec if c != "agents"]
    sets = ",".join(f"{q(c)}=excluded.{q(c)}" for c in cols if c != "id")
    conn.execute(
        f"INSERT INTO {ent}({','.join(q(c) for c in cols)}) VALUES({','.join('?' * len(cols))}) "
        f"ON CONFLICT(id) DO UPDATE SET {sets}",
        [rec[c] for c in cols])
    if ent == "players":
        conn.execute("DELETE FROM player_agents WHERE player_id=?", (rec["id"],))
        conn.executemany(
            "INSERT INTO player_agents(player_id,pos,agent,games,wins,kills,deaths) VALUES(?,?,?,?,?,?,?)",
            [(rec["id"], i, a["n"], a["g"], a["w"], a["k"], a["d"]) for i, a in enumerate(rec["agents"])])
    if ent == "gear":
        ensure_lib(conn, rec)
    if ent == "teams" and not seeding:
        seed_team_players(conn, rec["id"], rec["name"])
        seed_vct_results(conn)


def ensure_lib(conn, g):
    """อุปกรณ์รุ่นใหม่จะถูกเพิ่มเข้าคลังอุปกรณ์อัตโนมัติ (เหมือน ensureLib เดิม)"""
    key = norm(g["name"])
    if not key:
        return
    for lid, name, img in conn.execute("SELECT id, name, img FROM lib"):
        if norm(name) == key:
            if not img and g["img"]:
                conn.execute("UPDATE lib SET img=? WHERE id=?", (g["img"], lid))
            return
    conn.execute("INSERT INTO lib(id,name,brand,type,img) VALUES(?,?,?,?,?)",
                 (new_id(), g["name"], g["brand"], g["type"], g["img"] or GEAR_IMG_N.get(key, "")))


def delete(conn, ent, ids):
    if not isinstance(ids, list) or not ids or not all(isinstance(i, str) for i in ids):
        raise BadRequest("ไม่ได้เลือกรายการที่จะลบ")
    ids = ids[:1000]
    # foreign key จัดการต่อเอง: ลบทีม -> ผลแข่งถูกลบ และนักแข่ง/สตาฟฟ์ไม่มีทีม,
    # ลบนักแข่ง -> อุปกรณ์ไม่มีผู้ใช้, ลบรายการแข่ง -> ผลแข่งถูกลบ
    if ent == "teams":  # ลบทีม = ลบนักแข่งและอุปกรณ์ของนักแข่งทีมนั้นด้วย
        ph = ','.join('?' * len(ids))
        pids = [r[0] for r in conn.execute(f"SELECT id FROM players WHERE team IN ({ph})", ids)]
        if pids:
            pp = ','.join('?' * len(pids))
            conn.execute(f"DELETE FROM gear WHERE owner IN ({pp})", pids)
            conn.execute(f"DELETE FROM meta WHERE key IN ({pp})", ["gear:" + p for p in pids])
        conn.execute(f"DELETE FROM players WHERE team IN ({ph})", ids)
    if ent in ("results", "tours"):
        col = "tour" if ent == "results" else "id"
        tids = [r[0] for r in conn.execute(f"SELECT {col} FROM {ent} WHERE id IN ({','.join('?' * len(ids))})", ids)]
        if any(is_real_tour(conn, t) for t in tids):
            raise BadRequest("ข้อมูล VALORANT Champions เป็นข้อมูลจริงจากระบบ ลบไม่ได้")
    conn.execute(f"DELETE FROM {ent} WHERE id IN ({','.join('?' * len(ids))})", ids)


def migrate(conn):
    """เพิ่มคอลัมน์ใหม่ให้ฐานข้อมูลเดิม โดยไม่ลบข้อมูลที่มีอยู่"""
    for table, col in [("teams", "logo"), ("players", "photo")]:
        have = {r[1] for r in conn.execute(f"PRAGMA table_info({table})")}
        if col not in have:
            conn.execute(f"ALTER TABLE {table} ADD COLUMN {col} TEXT NOT NULL DEFAULT ''")


SEED_BY_TEAM = {}
for _t, _n, _r, _s in SEED_PLAYERS:
    SEED_BY_TEAM.setdefault(norm(_t), []).append((_n, _r, _s))


def seed_team_players(conn, tid, team_name):
    """ใส่นักแข่งตามรายชื่อตั้งต้นให้ทีมนี้ (เรียกเมื่อเพิ่มทีม) ไม่ซ้ำคนที่มีอยู่แล้ว"""
    for name, role, stats in SEED_BY_TEAM.get(norm(team_name), []):
        rows = conn.execute("SELECT id, team, role FROM players WHERE lower(name)=lower(?) ORDER BY rowid", (name,)).fetchall()
        mine = [r for r in rows if r[1] == tid]
        orphans = [r for r in rows if r[1] is None]
        if mine:
            keep = mine[0]
        elif orphans:
            keep = orphans[0]
            conn.execute("UPDATE players SET team=? WHERE id=?", (tid, keep[0]))
        else:
            pid = new_id()
            conn.execute("INSERT INTO players(id,name,real,team,role,price,photo) VALUES(?,?,?,?,?,?,?)",
                         (pid, name, "", tid, role, 0, ""))
            keep = (pid, tid, role)
        for r in orphans:
            if r[0] != keep[0]:
                conn.execute("DELETE FROM players WHERE id=?", (r[0],))
        if not keep[2] and role:
            conn.execute("UPDATE players SET role=? WHERE id=?", (role, keep[0]))
        if stats and not conn.execute("SELECT 1 FROM player_agents WHERE player_id=?", (keep[0],)).fetchone():
            conn.executemany(
                "INSERT INTO player_agents(player_id,pos,agent,games,wins,kills,deaths) VALUES(?,?,?,?,?,?,?)",
                [(keep[0], i, a, g, w, k, d) for i, (a, g, w, k, d) in enumerate(stats)])
        seed_player_gear(conn, keep[0], name)
        fill_random_gear(conn, keep[0])


def seed_player_gear(conn, pid, name):
    """ใส่อุปกรณ์จริงให้นักแข่งอัตโนมัติ ครั้งเดียวต่อคน (ถ้าผู้ใช้ลบ/แก้ทีหลัง จะไม่ถูกใส่ซ้ำ)"""
    key = "gear:" + pid
    if conn.execute("SELECT 1 FROM meta WHERE key=?", (key,)).fetchone():
        return
    conn.execute("INSERT INTO meta(key,value) VALUES(?,?)", (key, dt.datetime.now().isoformat(timespec="seconds")))
    if conn.execute("SELECT 1 FROM gear WHERE owner=?", (pid,)).fetchone():
        return
    for typ, item in zip(GEAR_ORDER, REAL_GEAR_N.get(norm(name), ())):
        if item:
            upsert(conn, "gear", clean("gear", {"name": item, "brand": gear_brand(item), "type": typ, "owner": pid,
                                                 "status": "พร้อมใช้", "cost": 0, "bought": "", "serial": "",
                                                 "note": "", "img": GEAR_IMG_N.get(norm(item), "")}))


def fill_random_gear(conn, pid):
    """ช่องอุปกรณ์ที่ยังว่าง สุ่มรุ่นจากคลังให้อัตโนมัติทุกครั้ง"""
    have = {r[0] for r in conn.execute("SELECT type FROM gear WHERE owner=?", (pid,))}
    for i, typ in enumerate(GEAR_ORDER):
        if typ in have:
            continue
        pool = sorted({v[i] for v in REAL_GEAR.values() if v[i]})
        if not pool:
            continue
        item = secrets.choice(pool)
        upsert(conn, "gear", clean("gear", {"name": item, "brand": gear_brand(item), "type": typ, "owner": pid,
                                             "status": "พร้อมใช้", "cost": 0, "bought": "", "serial": "",
                                             "note": "", "img": GEAR_IMG_N.get(norm(item), "")}))

def spread_unused_gear(conn):
    """รุ่นในคลังที่ยังไม่มีใครใช้ สุ่มให้นักแข่งสักคน (แทนรุ่นประเภทเดียวกันที่มีคนใช้ซ้ำหลายคน)"""
    for lid, name, brand, typ, img in conn.execute("SELECT id, name, brand, type, img FROM lib").fetchall():
        if conn.execute("SELECT 1 FROM gear WHERE lower(name)=lower(?)", (name,)).fetchone():
            continue
        idx = GEAR_ORDER.index(typ) if typ in GEAR_ORDER else -1
        rows = [r for r in conn.execute(
            "SELECT g.id, g.name, p.name FROM gear g JOIN players p ON p.id=g.owner WHERE g.type=? AND "
            "(SELECT COUNT(*) FROM gear x WHERE lower(x.name)=lower(g.name))>1", (typ,)).fetchall()
            # ไม่แตะอุปกรณ์จริงของนักแข่ง แทนเฉพาะรุ่นที่ระบบสุ่มให้
            if idx < 0 or norm(r[1]) != norm((REAL_GEAR_N.get(norm(r[2])) or (None,) * 5)[idx] or "")] or \
            conn.execute("SELECT g.id, g.name, '' FROM gear g WHERE g.type=? AND "
                         "(SELECT COUNT(*) FROM gear x WHERE lower(x.name)=lower(g.name))>1", (typ,)).fetchall()
        if not rows:
            continue
        gid = secrets.choice(rows)[0]
        conn.execute("UPDATE gear SET name=?, brand=?, img=? WHERE id=?",
                     (name, brand, img or GEAR_IMG_N.get(norm(name), ""), gid))

# รายการ VALORANT Champions 2022–2026 (Berlin 2021 ไม่มีนัดที่ทีมในระบบเจอกันเอง จึงไม่ใส่) เงินรางวัลแปลงจาก USD ประมาณ 33 บาท/ดอลลาร์
VCT_TOURS = [
    ("VALORANT Champions Istanbul 2022", "2022-08-31", "Istanbul, ตุรกี", 33000000),
    ("VALORANT Champions Los Angeles 2023", "2023-08-06", "Los Angeles, สหรัฐอเมริกา", 74250000),
    ("VALORANT Champions Seoul 2024", "2024-08-01", "Seoul, เกาหลีใต้", 74250000),
    ("VALORANT Champions Paris 2025", "2025-09-12", "Paris, ฝรั่งเศส", 74250000),
    ("VALORANT Champions Shanghai 2026", "2026-09-24", "Shanghai, จีน", 74250000),
]
# รายการ VCT ที่เลิกใช้แล้ว (จะถูกลบออกจากฐานข้อมูลเดิม พร้อมผลการแข่ง)
OLD_VCT_TOURS = ['VALORANT Champions Berlin 2021', 'VCT 2026: Americas Kickoff', 'VCT 2026: EMEA Kickoff', 'VCT 2026: Pacific Kickoff', 'VCT 2026: China Kickoff', 'VALORANT Masters Santiago 2026', 'VCT 2026: Americas Stage 1', 'VCT 2026: EMEA Stage 1', 'VCT 2026: Pacific Stage 1', 'VCT 2026: China Stage 1', 'VALORANT Masters London 2026', 'VCT 2026: Americas Stage 2', 'VCT 2026: EMEA Stage 2', 'VCT 2026: Pacific Stage 2', 'VCT 2026: China Stage 2']


def seed_vct_tours(conn):
    """รายการ VALORANT Champions ทุกปีมีครบเสมอ (ขาดรายการไหนจะเพิ่มให้ทุกครั้งที่เปิดเซิร์ฟเวอร์)"""
    for name in OLD_VCT_TOURS:
        ids = [r[0] for r in conn.execute("SELECT id FROM tours WHERE lower(name)=lower(?)", (name,))]
        if ids:
            conn.execute(f"DELETE FROM results WHERE tour IN ({','.join('?' * len(ids))})", ids)
            conn.execute(f"DELETE FROM tours WHERE id IN ({','.join('?' * len(ids))})", ids)
    have = {norm(r[0]) for r in conn.execute("SELECT name FROM tours")}
    for name, start, place, prize in VCT_TOURS:
        if norm(name) not in have:
            upsert(conn, "tours", clean("tours", {"name": name, "game": "VALORANT", "start": start, "place": place, "prize": prize}))


# ผลการแข่ง VALORANT Champions ทุกปี (thespike.gg / fragster.com) เฉพาะนัดที่ทั้งสองทีมอยู่ใน 21 ทีม: (รายการ, วันที่, ทีม A, คะแนน A, คะแนน B, ทีม B)
VCT_RESULTS = [
    ('VALORANT Champions Istanbul 2022', '2022-08-31', 'Paper Rex', 2, 1, 'EDWARD Gaming'),
    ('VALORANT Champions Istanbul 2022', '2022-09-01', 'ZETA DIVISION', 0, 2, 'LOUD'),
    ('VALORANT Champions Istanbul 2022', '2022-09-02', 'FNATIC', 1, 2, '100 Thieves'),
    ('VALORANT Champions Istanbul 2022', '2022-09-07', 'LOUD', 2, 0, 'ZETA DIVISION'),
    ('VALORANT Champions Istanbul 2022', '2022-09-08', '100 Thieves', 0, 2, 'FNATIC'),
    ('VALORANT Champions Los Angeles 2023', '2023-08-07', 'FUT Esports', 2, 0, 'T1'),
    ('VALORANT Champions Los Angeles 2023', '2023-08-08', 'FNATIC', 2, 0, 'ZETA DIVISION'),
    ('VALORANT Champions Los Angeles 2023', '2023-08-10', 'Paper Rex', 2, 0, 'EDWARD Gaming'),
    ('VALORANT Champions Los Angeles 2023', '2023-08-11', 'ZETA DIVISION', 0, 2, 'NRG'),
    ('VALORANT Champions Los Angeles 2023', '2023-08-12', 'FUT Esports', 2, 0, 'T1'),
    ('VALORANT Champions Los Angeles 2023', '2023-08-16', 'FNATIC', 0, 2, 'LOUD'),
    ('VALORANT Champions Los Angeles 2023', '2023-08-16', 'Paper Rex', 2, 0, 'FUT Esports'),
    ('VALORANT Champions Los Angeles 2023', '2023-08-18', 'FNATIC', 2, 0, 'FUT Esports'),
    ('VALORANT Champions Los Angeles 2023', '2023-08-19', 'LOUD', 1, 2, 'Paper Rex'),
    ('VALORANT Champions Los Angeles 2023', '2023-08-20', 'LOUD', 2, 1, 'EDWARD Gaming'),
    ('VALORANT Champions Los Angeles 2023', '2023-08-24', 'FNATIC', 1, 2, 'LOUD'),
    ('VALORANT Champions Seoul 2024', '2024-08-01', 'Gen.G', 2, 0, 'Sentinels'),
    ('VALORANT Champions Seoul 2024', '2024-08-04', 'EDWARD Gaming', 2, 0, 'FUT Esports'),
    ('VALORANT Champions Seoul 2024', '2024-08-04', 'G2 Esports', 2, 0, 'Paper Rex'),
    ('VALORANT Champions Seoul 2024', '2024-08-06', 'Team Heretics', 2, 1, 'Gen.G'),
    ('VALORANT Champions Seoul 2024', '2024-08-07', 'G2 Esports', 2, 1, 'EDWARD Gaming'),
    ('VALORANT Champions Seoul 2024', '2024-08-09', 'Paper Rex', 2, 0, 'FUT Esports'),
    ('VALORANT Champions Seoul 2024', '2024-08-10', 'Sentinels', 2, 0, 'Gen.G'),
    ('VALORANT Champions Seoul 2024', '2024-08-11', 'EDWARD Gaming', 2, 1, 'Paper Rex'),
    ('VALORANT Champions Seoul 2024', '2024-08-15', 'Team Heretics', 2, 0, 'FNATIC'),
    ('VALORANT Champions Seoul 2024', '2024-08-16', 'FNATIC', 2, 0, 'G2 Esports'),
    ('VALORANT Champions Seoul 2024', '2024-08-17', 'Sentinels', 1, 2, 'EDWARD Gaming'),
    ('VALORANT Champions Seoul 2024', '2024-08-18', 'Sentinels', 2, 1, 'FNATIC'),
    ('VALORANT Champions Seoul 2024', '2024-08-23', 'Team Heretics', 2, 1, 'Sentinels'),
    ('VALORANT Champions Seoul 2024', '2024-08-25', 'EDWARD Gaming', 3, 2, 'Team Heretics'),
    ('VALORANT Champions Paris 2025', '2025-09-12', 'Paper Rex', 2, 0, 'Xi Lai Gaming'),
    ('VALORANT Champions Paris 2025', '2025-09-13', 'NRG', 2, 0, 'EDWARD Gaming'),
    ('VALORANT Champions Paris 2025', '2025-09-14', 'G2 Esports', 0, 2, 'Team Heretics'),
    ('VALORANT Champions Paris 2025', '2025-09-15', 'Rex Regum Qeon', 0, 2, 'FNATIC'),
    ('VALORANT Champions Paris 2025', '2025-09-18', 'Team Heretics', 2, 0, 'T1'),
    ('VALORANT Champions Paris 2025', '2025-09-19', 'Xi Lai Gaming', 2, 1, 'Sentinels'),
    ('VALORANT Champions Paris 2025', '2025-09-22', 'T1', 0, 2, 'G2 Esports'),
    ('VALORANT Champions Paris 2025', '2025-09-25', 'Paper Rex', 2, 1, 'G2 Esports'),
    ('VALORANT Champions Paris 2025', '2025-09-28', 'FNATIC', 2, 1, 'Paper Rex'),
    ('VALORANT Champions Paris 2025', '2025-09-29', 'Paper Rex', 2, 1, 'Team Heretics'),
    ('VALORANT Champions Paris 2025', '2025-10-03', 'FNATIC', 0, 2, 'NRG'),
    ('VALORANT Champions Paris 2025', '2025-10-05', 'NRG', 3, 2, 'FNATIC'),
    ('VALORANT Champions Shanghai 2026', '2026-09-24', 'TYLOO GAMING', 0, 2, 'G2 Esports'),
    ('VALORANT Champions Shanghai 2026', '2026-09-25', 'Karmine Corp', 2, 0, 'Xi Lai Gaming'),
    ('VALORANT Champions Shanghai 2026', '2026-09-26', 'LOUD', 2, 0, 'EDWARD Gaming'),
    ('VALORANT Champions Shanghai 2026', '2026-09-27', '100 Thieves', 2, 0, 'T1'),
    ('VALORANT Champions Shanghai 2026', '2026-09-29', 'Karmine Corp', 1, 2, 'NRG'),
    ('VALORANT Champions Shanghai 2026', '2026-09-29', 'G2 Esports', 1, 2, 'Paper Rex'),
    ('VALORANT Champions Shanghai 2026', '2026-09-30', '100 Thieves', 2, 0, 'FUT Esports'),
    ('VALORANT Champions Shanghai 2026', '2026-09-30', 'Team Vitality', 2, 0, 'LOUD'),
    ('VALORANT Champions Shanghai 2026', '2026-10-04', 'FUT Esports', 0, 2, 'T1'),
    ('VALORANT Champions Shanghai 2026', '2026-10-07', 'Paper Rex', 0, 2, 'LOUD'),
    ('VALORANT Champions Shanghai 2026', '2026-10-07', 'NRG', 2, 0, 'T1'),
    ('VALORANT Champions Shanghai 2026', '2026-10-08', '100 Thieves', 0, 2, 'G2 Esports'),
    ('VALORANT Champions Shanghai 2026', '2026-10-09', 'T1', 2, 1, 'Paper Rex'),
    ('VALORANT Champions Shanghai 2026', '2026-10-10', 'G2 Esports', 0, 2, 'Team Vitality'),
    ('VALORANT Champions Shanghai 2026', '2026-10-10', 'NRG', 1, 2, 'LOUD'),
    ('VALORANT Champions Shanghai 2026', '2026-10-11', 'G2 Esports', 2, 1, 'T1'),
    ('VALORANT Champions Shanghai 2026', '2026-10-11', 'NRG', 0, 2, '100 Thieves'),
    ('VALORANT Champions Shanghai 2026', '2026-10-16', '100 Thieves', 2, 1, 'G2 Esports'),
    ('VALORANT Champions Shanghai 2026', '2026-10-16', 'LOUD', 2, 1, 'Team Vitality'),
    ('VALORANT Champions Shanghai 2026', '2026-10-17', 'Team Vitality', 3, 1, '100 Thieves'),
    ('VALORANT Champions Shanghai 2026', '2026-10-18', 'LOUD', 3, 1, 'Team Vitality'),
]


REAL_TOUR_N = {norm(t[0]) for t in VCT_TOURS}


def is_real_tour(conn, tid):
    row = conn.execute("SELECT name FROM tours WHERE id=?", (tid,)).fetchone()
    return bool(row) and norm(row[0]) in REAL_TOUR_N


def seed_vct_results(conn):
    """ผลของรายการ VALORANT Champions ตรงกับผลจริงเสมอ (เฉพาะนัดที่ทั้งสองทีมอยู่ในระบบ):
    เติมนัดที่ขาด แก้สกอร์ที่ไม่ตรง และเอานัดที่ไม่ใช่ผลจริงออก — รายการที่ผู้ใช้เพิ่มเองไม่ถูกแตะ"""
    conn.execute("DELETE FROM meta WHERE key LIKE 'nores:%'")  # ล้างค่าเก่าจากเวอร์ชันก่อน
    tours = {norm(n): i for i, n in conn.execute("SELECT id, name FROM tours")}
    teams = {norm(n): i for i, n in conn.execute("SELECT id, name FROM teams")}
    want = {}
    for tour, date, a, sa, sb, b in VCT_RESULTS:
        tid, ta, tb = tours.get(norm(tour)), teams.get(norm(a)), teams.get(norm(b))
        if tid and ta and tb:
            want.setdefault(tid, []).append((date, ta, tb, sa, sb))
    for tname in REAL_TOUR_N:
        tid = tours.get(tname)
        if not tid:
            continue
        rows = conn.execute("SELECT id, date, a, b, sa, sb FROM results WHERE tour=?", (tid,)).fetchall()
        used = set()
        for date, ta, tb, sa, sb in want.get(tid, []):
            hit = next((r for r in rows if r[0] not in used and r[1] == date and {r[2], r[3]} == {ta, tb}), None)
            if hit:
                used.add(hit[0])
                if (hit[2], hit[3], hit[4], hit[5]) != (ta, tb, sa, sb):
                    conn.execute("UPDATE results SET a=?, b=?, sa=?, sb=? WHERE id=?", (ta, tb, sa, sb, hit[0]))
            else:
                upsert(conn, "results", clean("results", {"tour": tid, "date": date, "a": ta, "b": tb, "sa": sa, "sb": sb}), seeding=True)
        extra = [r[0] for r in rows if r[0] not in used]
        if extra:
            conn.execute(f"DELETE FROM results WHERE id IN ({','.join('?' * len(extra))})", extra)


def sync_seed(conn):
    """ซิงค์ทุกครั้งที่เปิดเซิร์ฟเวอร์: นักแข่งจะมีเฉพาะทีมที่เพิ่มไว้แล้ว
    - ทีมในรายชื่อที่มีอยู่ จะได้นักแข่งครบ (ผูกคนที่ไม่มีทีมกลับเข้าทีม)
    - นักแข่งตามรายชื่อที่ไม่มีทีม (ทีมยังไม่ถูกเพิ่ม/ถูกลบ) จะถูกเอาออก
    ไม่แตะทีมหรือนักแข่งที่ผู้ใช้เพิ่มเองนอกรายชื่อ"""
    for tid, name in conn.execute("SELECT id, name FROM teams").fetchall():
        seed_team_players(conn, tid, name)
    # คลังอุปกรณ์: มีทุกรุ่นที่โปรใช้จริงเสมอ
    for vals in REAL_GEAR.values():
        for typ, item in zip(GEAR_ORDER, vals):
            if item:
                ensure_lib(conn, {"name": item, "brand": gear_brand(item), "type": typ, "img": GEAR_IMG_N.get(norm(item), "")})
    # รูปจริงของอุปกรณ์: ใส่ให้รุ่นที่ยังไม่มีรูป
    for ent in ("lib", "gear"):
        for rid, name in conn.execute(f"SELECT id, name FROM {ent} WHERE img=''").fetchall():
            u = GEAR_IMG_N.get(norm(name))
            if u:
                conn.execute(f"UPDATE {ent} SET img=? WHERE id=?", (u, rid))
    spread_unused_gear(conn)
    seed_vct_tours(conn)
    seed_vct_results(conn)
    seed_names = [n for n, _, _ in sum(SEED_BY_TEAM.values(), [])]
    for n in seed_names:
        conn.execute("DELETE FROM players WHERE team IS NULL AND lower(name)=lower(?)", (n,))


def init_db(reset=False):
    if reset and DB_PATH.exists():
        DB_PATH.unlink()
    conn = connect()
    try:
        with conn:
            conn.executescript(SCHEMA)
            migrate(conn)
            if conn.execute("SELECT 1 FROM meta WHERE key='seeded'").fetchone():
                sync_seed(conn)
                return
            for ent, rows in build_seed().items():
                for r in rows:
                    upsert(conn, ent, clean(ent, r), seeding=True)
            sync_seed(conn)
            conn.execute("INSERT INTO meta(key,value) VALUES('seeded',?)", (dt.datetime.now().isoformat(timespec="seconds"),))
    finally:
        conn.close()


# ---------- โทเค็นผู้ดูแล ----------
def issue_token():
    t = secrets.token_urlsafe(32)
    with tokens_lock:
        now = time.time()
        for k in [k for k, exp in tokens.items() if exp < now]:
            del tokens[k]
        tokens[t] = now + TOKEN_TTL
    return t


def valid_token(t):
    if not t:
        return False
    with tokens_lock:
        exp = tokens.get(t)
        return bool(exp and exp > time.time())


# =====================================================================
# หน้าเว็บ (templates/*.html)
# =====================================================================
PAGES = ["home", "teams", "players", "player", "staff", "gear", "lib", "tours", "results", "bracket", "compare"]


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/<page>")
def page(page):
    if page.endswith(".html"):           # รองรับลิงก์แบบเดิม เช่น /teams.html
        page = page[:-5]
    if page == "index":
        return render_template("index.html")
    if page not in PAGES:
        abort(404)
    return render_template(page + ".html")


@app.after_request
def headers(resp):
    resp.headers["X-Content-Type-Options"] = "nosniff"
    if request.path.startswith("/api/"):
        resp.headers["Cache-Control"] = "no-store"
    return resp


# =====================================================================
# API (JSON)
# =====================================================================
def err(status, message):
    return jsonify({"error": message}), status


def body_json():
    if not request.is_json:
        raise BadRequest("ต้องส่งข้อมูลเป็น JSON")
    data = request.get_json(silent=True)
    if data is None:
        raise BadRequest("JSON ไม่ถูกต้อง")
    return data


@app.errorhandler(BadRequest)
def bad_request(e):
    return err(400, str(e))


@app.errorhandler(sqlite3.IntegrityError)
def integrity(e):
    return err(400, "ข้อมูลอ้างอิงไม่ถูกต้อง (ทีม/นักแข่ง/รายการที่เลือกอาจถูกลบไปแล้ว) กรุณาโหลดหน้าใหม่")


@app.errorhandler(413)
def too_large(e):
    return err(413, "ข้อมูลมีขนาดใหญ่เกินไป")


@app.get("/api/state")
def api_state():
    conn = connect()
    try:
        # รายการ VALORANT Champions และผลการแข่งต้องมีครบเสมอ (ไม่ต้องรีสตาร์ทเซิร์ฟเวอร์)
        with conn:
            seed_vct_tours(conn)
            seed_vct_results(conn)
        return jsonify(load_state(conn))
    finally:
        conn.close()


@app.post("/api/login")
def api_login():
    data = body_json()
    pw = str(data.get("password", "")) if isinstance(data, dict) else ""
    if not secrets.compare_digest(pw.encode(), ADMIN_PASSWORD.encode()):
        time.sleep(0.5)
        return err(401, "รหัสผ่านไม่ถูกต้อง ลองใหม่อีกครั้ง")
    return jsonify({"token": issue_token()})


@app.get("/api/session")
def api_session():
    """ให้หน้าเว็บตรวจว่าการล็อกอินผู้ดูแลยังใช้ได้อยู่ไหม (เช่น หลังรีสตาร์ตหรือเปลี่ยนรหัส)"""
    return jsonify({"admin": valid_token(request.headers.get("X-Admin-Token"))})


@app.post("/api/logout")
def api_logout():
    with tokens_lock:
        tokens.pop(request.headers.get("X-Admin-Token", ""), None)
    return jsonify({"ok": True})


def admin_write(ent, action):
    if ent not in FIELDS:
        return err(404, "ไม่พบ API นี้")
    if not valid_token(request.headers.get("X-Admin-Token")):
        return err(401, "เซสชันผู้ดูแลหมดอายุ กรุณาเข้าสู่ระบบใหม่")
    data = body_json()
    with write_lock:
        conn = connect()
        try:
            with conn:
                action(conn, data)
            state = load_state(conn)
        finally:
            conn.close()
    return jsonify({"state": state})


@app.post("/api/<ent>")
def api_save(ent):
    """เพิ่ม/แก้ไข 1 รายการ (ส่ง id เดิมมาเพื่อแก้ไข)"""
    return admin_write(ent, lambda conn, data: upsert(conn, ent, clean(ent, data)))


@app.post("/api/<ent>/delete")
def api_delete(ent):
    """ลบหลายรายการ: {"ids": [...]}"""
    return admin_write(ent, lambda conn, data: delete(conn, ent, data.get("ids") if isinstance(data, dict) else None))


# =====================================================================

def main():
    ap = argparse.ArgumentParser(description="E-Sports Team Manager (Flask)")
    ap.add_argument("--host", default="127.0.0.1")
    ap.add_argument("--port", type=int, default=5000)
    ap.add_argument("--init-db", action="store_true")
    ap.add_argument("--debug", action="store_true")
    args = ap.parse_args()

    if args.init_db:
        init_db(reset=True)
        print(f"สร้างฐานข้อมูลใหม่แล้ว: {DB_PATH}")
        return

    # ตรวจพอร์ตเฉพาะกระบวนการหลัก
    if os.environ.get("WERKZEUG_RUN_MAIN") != "true":
        import socket
        host = "127.0.0.1" if args.host in ("0.0.0.0", "") else args.host

        with socket.socket() as sk:
            sk.settimeout(0.5)
            if sk.connect_ex((host, args.port)) == 0:
                print(f"!! พอร์ต {args.port} ถูกใช้งานอยู่แล้ว")
                pause_on_error()
                return

    app.run(host=args.host, port=args.port, debug=True)


def pause_on_error():
    if sys.stdin is not None and sys.stdin.isatty():
        try:
            input("\nกด Enter เพื่อปิดหน้าต่างนี้...")
        except (EOFError, KeyboardInterrupt, OSError):
            pass


if __name__ == "__main__":
    try:
        init_db()
        main()
    except KeyboardInterrupt:
        print("\nปิดเซิร์ฟเวอร์แล้ว")
    except Exception:
        print("\nเกิดข้อผิดพลาดขณะเริ่มโปรแกรม:", file=sys.stderr)
        traceback.print_exc()
        pause_on_error()
else:
    init_db()