-- ═══════════════════════════════════════════════════════════════════
--  immm 경쟁사 리서치 허브 — Supabase 테이블 생성 SQL
--  사용법: Supabase 대시보드 → 왼쪽 "SQL Editor" → 이 내용 전체 붙여넣기 → Run
-- ═══════════════════════════════════════════════════════════════════

-- 1) 경쟁사 테이블 만들기
create table if not exists public.competitors (
  id            text primary key,          -- 경쟁사 고유 id (앱이 자동 생성)
  brand         text not null default '',  -- 브랜드명
  url           text default '',           -- 자사몰 URL
  price_min     text default '',           -- 가격대(최소)
  price_max     text default '',           -- 가격대(최대)
  target        text default '',           -- 타깃 고객
  channels      jsonb default '[]'::jsonb, -- 판매 채널 목록
  review_count  text default '',           -- 후기 수
  shipping      text default '',           -- 배송 속도
  photo_style   text default '',           -- 사진 스타일
  discount      text default '',           -- 할인 빈도
  best_name     text default '',           -- 베스트셀러 상품명
  best_price    text default '',           -- 베스트셀러 가격
  material      text default '',           -- 주요 소재
  bag_type      text default '',           -- 가방 종류
  followers     text default '',           -- 인스타 팔로워
  post_freq     text default '',           -- 게시물 빈도
  content       text default '',           -- 콘텐츠 방식
  memo          text default '',           -- 메모
  monitor       text default '',           -- 모니터링 주기
  reviews       jsonb default '[]'::jsonb, -- 불만 리뷰 분석 이력(날짜별 누적)
  created_at    text default '',           -- 등록일(화면 표시용)
  updated_at    text default '',           -- 수정일(화면 표시용)
  inserted_at   timestamptz not null default now()  -- 정렬용(자동)
);

-- 2) 행 보안(RLS) 켜기
alter table public.competitors enable row level security;

-- 3) 공개키(anon)로 읽고 쓰게 허용하는 정책
--    로그인 없는 1인용 내부 도구라 전체 허용. (보안 강화는 나중에 가능)
drop policy if exists "anon full access" on public.competitors;
create policy "anon full access" on public.competitors
  for all
  to anon
  using (true)
  with check (true);

-- 4) 샘플 경쟁사(스탠드오일) 1건 넣기 (원하면 나중에 앱에서 삭제 가능)
insert into public.competitors (
  id, brand, url, price_min, price_max, target, channels,
  review_count, shipping, photo_style, discount,
  best_name, best_price, material, bag_type,
  followers, post_freq, content, memo, monitor,
  reviews, created_at, updated_at
) values (
  'seed-standoil', '스탠드오일', 'https://standoil.com', '69,000', '129,000', '20~30대 여성',
  '["무신사","29CM","자사몰","스마트스토어"]'::jsonb,
  '3,120', '평균 3~5일', '화이트 배경 · 착용컷 중심', '월 1회 시즌오프',
  '미니 크로스백', '89,000', '비건레더, PU', '크로스백',
  '21.4만', '주 3~5회', '룩북 위주, 착용컷 강조. 숏폼 간헐적. 라이브커머스 없음.',
  '미니멀 포지셔닝 강함. 수납력 약점 존재 — immm 차별화 포인트로 활용 가능. 가격대 겹침 주의.', '주 1회',
  '[{"date":"2026.07.07","categories":["배송 지연","마감 불균일","소재 차이","AS 대응 느림"],"keywords":["배송","AS","소재","마감","재구매"],"summary":"재구매 의향은 높은 편이나 배송 속도와 AS 대응에 불만이 반복 언급됨. 소재 질감이 상세페이지 사진과 차이 난다는 지적 다수. 마감 품질이 제품마다 달라 일관성 부재 우려."}]'::jsonb,
  '2026.07.07', '2026.07.07'
)
on conflict (id) do nothing;
