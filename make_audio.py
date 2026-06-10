import os
import urllib.request
import urllib.parse

# 1. 여기에 준비하신 30개의 데이터를 입력하세요!
# (id 번호와 실제 읽을 텍스트 문장)
data_list = [
    {"id": 1, "text": "これはいくらですか？"},
    {"id": 2, "text": "カードは使えますか？"},
    {"id": 3, "text": "免税できますか？"},
    {"id": 4, "text": "別の色はありますか？"},
    {"id": 5, "text": "サイズが合いません。"},
    {"id": 6, "text": "袋は結構です。"},
    {"id": 7, "text": "おはようございます。"},
    {"id": 8, "text": "こんにちは。"},
    {"id": 9, "text": "こんばんは。"},
    {"id": 10, "text": "ありがとうございます。"},
    {"id": 11, "text": "すみません。"},
    {"id": 12, "text": "さようなら。"},
    {"id": 13, "text": "おすすめは何ですか？"},
    {"id": 14, "text": "メニューをお願いします。"},
    {"id": 15, "text": "これをお願いします。"},
    {"id": 16, "text": "お会計をお願いします。"},
    {"id": 17, "text": "お水をもらえますか？"},
    {"id": 18, "text": "テイクアウトでお願いします。"},
    {"id": 19, "text": "駅はどこですか？"},
    {"id": 20, "text": "トイレはどこですか？"},
    {"id": 21, "text": "〜に行きたいです。"},
    {"id": 22, "text": "この電車は〜に行きますか？"},
    {"id": 23, "text": "切符売り場はどこですか？"},
    {"id": 24, "text": "ここはどこですか？"},
    {"id": 25, "text": "チェックインをお願いします。"},
    {"id": 26, "text": "チェックアウトをお願いします。"},
    {"id": 27, "text": "荷物を預けてもいいですか？"},
    {"id": 28, "text": "部屋の掃除をお願いします。"},
    {"id": 29, "text": "タオルを追加でもらえますか？"},
    {"id": 30, "text": "朝食は何時からですか？"}
]

# 2. 파일이 저장될 폴더 생성
output_dir = "./audio"
if not os.path.exists(output_dir):
    os.makedirs(output_dir)

print("🔊 TTS 파일 자동 생성을 시작합니다...")

# 3. 반복문을 돌며 구글 TTS에서 오디오 다운로드
for item in data_list:
    file_id = item["id"]
    text = item["text"]
    
    # 일본어 텍스트를 URL에 쓸 수 있도록 인코딩
    encoded_text = urllib.parse.quote(text)
    
    # 구글 비공식 TTS URL 생성
    tts_url = f"https://translate.google.com/translate_tts?ie=UTF-8&tl=ja&client=tw-ob&q={encoded_text}"
    
    # 저장할 파일 경로 (예: ./audio/audio_1.mp3)
    file_path = os.path.join(output_dir, f"audio_{file_id}.mp3")
    
    try:
        # 구글 서버에 요청할 때 브라우저인 척 헤더 추가 (차단 방지)
        req = urllib.request.Request(
            tts_url, 
            headers={'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)'}
        )
        
        # 파일 다운로드 및 저장
        with urllib.request.urlopen(req) as response, open(file_path, 'wb') as out_file:
            out_file.write(response.read())
            
        print(f"✅ 성공: audio_{file_id}.mp3 생성 완료 ('{text[:10]}...')")
        
    except Exception as e:
        print(f"❌ 실패: audio_{file_id}.mp3 생성 중 에러 발생 ({e})")

print("🎉 모든 파일 생성 완료! ./audio 폴더를 확인하세요.")