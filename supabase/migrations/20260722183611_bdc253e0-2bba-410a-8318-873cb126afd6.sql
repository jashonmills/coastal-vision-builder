-- Drop legacy underused table
DROP TABLE IF EXISTS public.gallery_images CASCADE;

CREATE TABLE public.site_images (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  category text NOT NULL,
  bucket text NOT NULL DEFAULT 'new-images',
  file text NOT NULL,
  url text NOT NULL,
  alt text NOT NULL DEFAULT '',
  caption text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX site_images_category_sort_idx ON public.site_images (category, sort_order);

GRANT SELECT ON public.site_images TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.site_images TO authenticated;
GRANT ALL ON public.site_images TO service_role;

ALTER TABLE public.site_images ENABLE ROW LEVEL SECURITY;

CREATE POLICY "site_images public read" ON public.site_images
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "site_images admin insert" ON public.site_images
  FOR INSERT TO authenticated WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "site_images admin update" ON public.site_images
  FOR UPDATE TO authenticated USING (public.has_role(auth.uid(), 'admin')) WITH CHECK (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "site_images admin delete" ON public.site_images
  FOR DELETE TO authenticated USING (public.has_role(auth.uid(), 'admin'));

CREATE TRIGGER site_images_updated_at
  BEFORE UPDATE ON public.site_images
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Storage policies: allow admins to upload/delete in the two public image buckets
CREATE POLICY "site_images admin storage insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id IN ('images','new-images') AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "site_images admin storage update" ON storage.objects
  FOR UPDATE TO authenticated
  USING (bucket_id IN ('images','new-images') AND public.has_role(auth.uid(), 'admin'))
  WITH CHECK (bucket_id IN ('images','new-images') AND public.has_role(auth.uid(), 'admin'));

CREATE POLICY "site_images admin storage delete" ON storage.objects
  FOR DELETE TO authenticated
  USING (bucket_id IN ('images','new-images') AND public.has_role(auth.uid(), 'admin'));

-- Seed from current hardcoded catalog
INSERT INTO public.site_images (category, bucket, file, url, alt, caption, sort_order) VALUES
('gallery_setups', 'new-images', 'View 1.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/View%201.jpg', 'Event tent setup — view 1', NULL, 0),
('gallery_setups', 'new-images', 'View 2.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/View%202.jpg', 'Event tent setup — view 2', NULL, 1),
('gallery_setups', 'new-images', 'View 3.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/View%203.jpg', 'Event tent setup — view 3', NULL, 2),
('gallery_setups', 'new-images', 'View 5.JPG', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/View%205.JPG', 'Event tent setup — view 5', NULL, 3),
('gallery_setups', 'new-images', 'View 6.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/View%206.jpg', 'Event tent setup — view 6', NULL, 4),
('gallery_setups', 'new-images', 'View 7.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/View%207.jpg', 'Event tent setup — view 7', NULL, 5),
('gallery_setups', 'new-images', 'View 7-2.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/View%207-2.jpg', 'Event tent setup — view 7 alternate', NULL, 6),
('gallery_setups', 'new-images', 'View 10.jpeg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/View%2010.jpeg', 'Event tent setup — view 10', NULL, 7),
('gallery_setups', 'new-images', 'View 10-2.jpeg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/View%2010-2.jpeg', 'Event tent setup — view 10 alternate', NULL, 8),
('gallery_setups', 'new-images', 'Tent in backyard.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/Tent%20in%20backyard.jpg', 'Tent set up in a backyard', NULL, 9),
('gallery_setups', 'new-images', 'Tent in backyard 2.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/Tent%20in%20backyard%202.jpg', 'Backyard tent — alternate angle', NULL, 10),
('gallery_setups', 'new-images', 'Tent near lake.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/Tent%20near%20lake.jpg', 'Tent set up near a lake', NULL, 11),
('gallery_setups', 'new-images', '2 20'' Tent with windows.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/2%2020''%20Tent%20with%20windows.jpg', '20'' tent with windows', NULL, 12),
('gallery_setups', 'new-images', '20x60 Tent(1).jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/20x60%20Tent(1).jpg', '20x60 frame tent', NULL, 13),
('gallery_setups', 'new-images', '10x20-frame-tent-seating-for-16.webp', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/10x20-frame-tent-seating-for-16.webp', '10x20 frame tent seating for 16', NULL, 14),
('gallery_setups', 'new-images', 'marq. underside.png', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/marq.%20underside.png', 'Marquee tent underside', NULL, 15),
('gallery_setups', 'new-images', '1051-1.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/1051-1.jpg', 'Past event setup', NULL, 16),
('gallery_setups', 'new-images', '331.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/331.jpg', 'Past event setup', NULL, 17),
('gallery_setups', 'new-images', '2e19a1a821c8b6ec8943c7abfa09ceb0.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/2e19a1a821c8b6ec8943c7abfa09ceb0.jpg', 'Past event setup', NULL, 18),
('gallery_setups', 'new-images', '67dac2ff3cf5f7bd8e60be5b1af34380.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/67dac2ff3cf5f7bd8e60be5b1af34380.jpg', 'Past event setup', NULL, 19),
('gallery_setups', 'new-images', 'c0e876c73fbd4fb1bc5cf20e716754e7.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/c0e876c73fbd4fb1bc5cf20e716754e7.jpg', 'Past event setup', NULL, 20),
('gallery_equipment', 'new-images', '6Professionalbarjpg.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/6Professionalbarjpg.jpg', 'Professional portable bar', NULL, 0),
('gallery_equipment', 'new-images', 'Portable Bar 1.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/Portable%20Bar%201.jpg', 'Portable bar — view one', NULL, 1),
('gallery_equipment', 'new-images', 'Portable Bar 2.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/Portable%20Bar%202.jpg', 'Portable bar — view two', NULL, 2),
('gallery_equipment', 'new-images', 'Portable Bar 3.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/Portable%20Bar%203.jpg', 'Portable bar — view three', NULL, 3),
('gallery_equipment', 'new-images', 'fill and chill.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/fill%20and%20chill.jpg', 'Fill and chill beverage station', NULL, 4),
('gallery_equipment', 'new-images', '55 gallon water barrel.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/55%20gallon%20water%20barrel.jpg', '55 gallon water barrel', NULL, 5),
('gallery_equipment', 'new-images', 'Patio heater.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/Patio%20heater.jpg', 'Propane patio heater', NULL, 6),
('gallery_equipment', 'cdn', 'sony-ult10-pa-system.jpg', '/__l5e/assets-v1/42623976-d839-46a6-87e1-1a9dd87abe1e/sony-ult10-pa-system.jpg', 'Sony ULT10 PA system', NULL, 7),
('gallery_equipment', 'cdn', 'cafe-lights.webp', '/__l5e/assets-v1/3ca4b1a2-0729-44bd-b0df-9659d355768b/cafe-lights.webp', 'Commercial-grade cafe string lights with Edison bulbs', 'Cafe string lights (Edison bulbs)', 8),
('gallery_furniture', 'new-images', 'Black Chair.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/Black%20Chair.jpg', 'Black folding chair', NULL, 0),
('gallery_furniture', 'new-images', '_White Chair.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/_White%20Chair.jpg', 'White folding chair', NULL, 1),
('gallery_furniture', 'new-images', 'wood-folding-fruitwood.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/wood-folding-fruitwood.jpg', 'Fruitwood folding chair', NULL, 2),
('gallery_furniture', 'new-images', '60 round.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/60%20round.jpg', '60-inch round folding table', NULL, 3),
('gallery_furniture', 'new-images', '8'' table.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/new-images/8''%20table.jpg', '8-foot rectangular folding table', NULL, 4),
('blueprints', 'images', '474563191_565306963173752_1136886455040851362_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/474563191_565306963173752_1136886455040851362_n.jpg', 'Floor plan: 20 by 60 foot frame tent with eight round tables and a sixteen-section dance floor', '20×60 Frame Tent · 8 round tables · 64 chairs · 16 dance-floor sections', 0),
('blueprints', 'images', '517165782_695961306774983_6044612679187186672_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/517165782_695961306774983_6044612679187186672_n.jpg', 'Floor plan combining two 20 by 20 hex tents with dance floor and catering area', 'Two 20×20 hex tents · 120–160 guests · dance floor + catering', 1),
('blueprints', 'images', '474463283_565307009840414_7074023454884750889_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/474463283_565307009840414_7074023454884750889_n.jpg', 'Five seating variations for a 20 by 20 canopy', '20×20 canopy · 5 seating options (32–54 chairs)', 2),
('blueprints', 'images', '488600635_620872890950492_8628789741656867627_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/488600635_620872890950492_8628789741656867627_n.jpg', 'Four seating layouts for 20 by 20 tents', 'Seating layouts for 20×20 tents', 3),
('blueprints', 'images', '488978407_620872867617161_1556481910414724815_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/488978407_620872867617161_1556481910414724815_n.jpg', 'Three seating layouts for 10 by 20 tents', 'Seating layouts for 10×20 tents', 4),
('blueprints', 'images', '488602422_620872864283828_7647138966100628412_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/488602422_620872864283828_7647138966100628412_n.jpg', 'Four seating layouts for 20 by 40 tents', 'Seating layouts for 20×40 tents', 5),
('blueprints', 'images', '488645422_620872920950489_2299407176129296613_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/488645422_620872920950489_2299407176129296613_n.jpg', 'Three seating layouts for 10 by 10 tents', 'Seating layouts for 10×10 tents', 6),
('blueprints', 'images', '480938094_589477454090036_9027517813852096889_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/480938094_589477454090036_9027517813852096889_n.jpg', 'Wedding ceremony floor plan inside a 20 by 40 frame tent with 80 folding chairs', 'Wedding ceremony · 20×40 frame tent · 80 chairs', 7),
('blueprints', 'images', '474456177_564737223230726_5504818826038496031_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/474456177_564737223230726_5504818826038496031_n.jpg', '20 by 40 frame tent shown with banquet tables and round tables', '20×40 frame tent · banquet or round table layout', 8),
('blueprints', 'images', '480575350_589477564090025_5245801037659980793_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/480575350_589477564090025_5245801037659980793_n.jpg', '20 by 40 frame tent with mixed banquet and round table seating', '20×40 frame tent · 80–64 guests', 9),
('blueprints', 'images', '474259057_565307199840395_3796474448715405360_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/474259057_565307199840395_3796474448715405360_n.jpg', '20 by 40 marquee tent illustration with round table layout', '20×40 marquee tent · round table layout', 10),
('blueprints', 'images', '517385670_695961310108316_1740422929856782877_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/517385670_695961310108316_1740422929856782877_n.jpg', 'Hexagon tent variation reference sheet', 'Hexagon tent variations', 11),
('blueprints', 'images', '481000015_589607617410353_9019655516564925065_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/481000015_589607617410353_9019655516564925065_n.jpg', 'Hexagon tent variation reference sheet', 'Hexagon tent variations', 12),
('blueprints', 'images', '481447287_589477590756689_4406621329276958219_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/481447287_589477590756689_4406621329276958219_n.jpg', '20 by 40 marquee tent illustration with round table layout', '20×40 marquee tent · round table layout', 13),
('products', 'images', '469177750_529823493388766_6347225283875997257_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/469177750_529823493388766_6347225283875997257_n.jpg', '60-inch round folding table', NULL, 0),
('products', 'images', '469372788_529823503388765_4348043901117254958_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/469372788_529823503388765_4348043901117254958_n.jpg', '8-foot rectangular folding table', NULL, 1),
('products', 'images', '469150182_529823540055428_4671922222938595837_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/469150182_529823540055428_4671922222938595837_n.jpg', 'Black folding chair', NULL, 2),
('products', 'images', '469165463_529823473388768_7013416796850691535_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/469165463_529823473388768_7013416796850691535_n.jpg', 'Outdoor propane patio heater', NULL, 3),
('products', 'cdn', 'sony-ult10-pa-system.jpg', '/__l5e/assets-v1/42623976-d839-46a6-87e1-1a9dd87abe1e/sony-ult10-pa-system.jpg', 'Sony ULT10 PA system', NULL, 4),
('photos', 'images', '469103714_529823583388757_5821615986589818114_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/469103714_529823583388757_5821615986589818114_n.jpg', 'Oregon Coast event tent setup', NULL, 0),
('photos', 'images', '469143421_529823760055406_8167397046202509944_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/469143421_529823760055406_8167397046202509944_n.jpg', 'Tent reception with table settings', NULL, 1),
('photos', 'images', '469312785_529823293388786_3537228070558775988_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/469312785_529823293388786_3537228070558775988_n.jpg', 'Catering buffet table with food spread', NULL, 2),
('photos', 'images', '472843788_555397524164696_310875170561736773_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/472843788_555397524164696_310875170561736773_n.jpg', 'Outdoor event tent on the coast', NULL, 3),
('photos', 'images', '473592002_559650870406028_3348516647888160355_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/473592002_559650870406028_3348516647888160355_n.jpg', 'Evening tent with warm lighting', NULL, 4),
('photos', 'images', '473616827_559650917072690_5340889121591763082_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/473616827_559650917072690_5340889121591763082_n.jpg', 'Tent interior styled for a reception', NULL, 5),
('photos', 'images', '473619262_559650953739353_1042426680856328212_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/473619262_559650953739353_1042426680856328212_n.jpg', 'Wedding reception under a frame tent', NULL, 6),
('photos', 'images', '477774387_581310684906713_3535566232057442071_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/477774387_581310684906713_3535566232057442071_n.jpg', 'Coastal event setup at golden hour', NULL, 7),
('photos', 'images', '479981805_582339711470477_5695802475426332013_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/479981805_582339711470477_5695802475426332013_n.jpg', 'Outdoor celebration tent', NULL, 8),
('photos', 'images', '480905156_586604277710687_7910586654484016224_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/480905156_586604277710687_7910586654484016224_n.jpg', 'Tent and table setup before guests arrive', NULL, 9),
('photos', 'images', '480928681_588116267559488_6265058064909025116_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/480928681_588116267559488_6265058064909025116_n.jpg', 'Festival vendor tent', NULL, 10),
('photos', 'images', '481168375_589298140774634_6869263384576956075_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/481168375_589298140774634_6869263384576956075_n.jpg', 'Wedding reception tent interior', NULL, 11),
('photos', 'images', '481275883_591672693870512_4782124943036351944_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/481275883_591672693870512_4782124943036351944_n.jpg', 'Outdoor private party tent', NULL, 12),
('photos', 'images', '481977720_597885596582555_1292309761831142039_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/481977720_597885596582555_1292309761831142039_n.jpg', 'Tent setup at dusk with string lights', NULL, 13),
('photos', 'images', '489155647_623363370701444_6038613740890065939_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/489155647_623363370701444_6038613740890065939_n.jpg', 'Coastal wedding tent on the beach', NULL, 14),
('photos', 'images', '492004498_636109879426793_8448455459233426235_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/492004498_636109879426793_8448455459233426235_n.jpg', 'Frame tent reception with dining tables', NULL, 15),
('photos', 'images', '493743462_640100312361083_109003193886203950_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/493743462_640100312361083_109003193886203950_n.jpg', 'Outdoor corporate event tent', NULL, 16),
('photos', 'images', '503580985_668256652878782_1786729605668802944_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/503580985_668256652878782_1786729605668802944_n.jpg', 'Event tent reception with floral centerpieces', NULL, 17),
('photos', 'images', '515978807_716959321341848_1041124182856331715_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/515978807_716959321341848_1041124182856331715_n.jpg', 'Tent setup with bar and lounge area', NULL, 18),
('photos', 'images', '516880908_695144426856671_5536688911026073693_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/516880908_695144426856671_5536688911026073693_n.jpg', 'Reception tent under coastal evening sky', NULL, 19),
('photos', 'images', '517402629_695961400108307_2554067438201962614_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/517402629_695961400108307_2554067438201962614_n.jpg', 'Wedding tent with hanging lights', NULL, 20),
('photos', 'images', '518051008_695961203441660_5858388040880933537_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/518051008_695961203441660_5858388040880933537_n.jpg', 'Outdoor wedding ceremony seating', NULL, 21),
('photos', 'images', '518719135_702356896135424_7203534893586646496_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/518719135_702356896135424_7203534893586646496_n.jpg', 'Festival tent row at dusk', NULL, 22),
('photos', 'images', '519426015_695961206774993_9183983329355994245_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/519426015_695961206774993_9183983329355994245_n.jpg', 'Coastal reception with sunset backdrop', NULL, 23),
('photos', 'images', '527224258_716959364675177_1938040731493724615_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/527224258_716959364675177_1938040731493724615_n.jpg', 'Tent setup with bistro lighting', NULL, 24),
('photos', 'images', '536887974_730801069957673_7523838707378289774_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/536887974_730801069957673_7523838707378289774_n.jpg', 'Coastal event tent at twilight', NULL, 25),
('photos', 'images', '537447385_730803213290792_164603695709163801_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/537447385_730803213290792_164603695709163801_n.jpg', 'Wedding reception tent with banquet tables', NULL, 26),
('photos', 'images', '537543257_730801106624336_6992849400480143259_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/537543257_730801106624336_6992849400480143259_n.jpg', 'Outdoor private party with tent and seating', NULL, 27),
('photos', 'images', '538218786_730803399957440_9003608376902676372_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/538218786_730803399957440_9003608376902676372_n.jpg', 'Reception tent interior with chandeliers', NULL, 28),
('photos', 'images', '538317848_730803386624108_4632632641682768296_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/538317848_730803386624108_4632632641682768296_n.jpg', 'Coastal wedding tent at golden hour', NULL, 29),
('photos', 'images', '654301047_902739286097183_8263221457944672870_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/654301047_902739286097183_8263221457944672870_n.jpg', 'Frame tent ready for guests', NULL, 30),
('photos', 'images', '670389331_920421537662291_6410634364917607168_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/670389331_920421537662291_6410634364917607168_n.jpg', 'Beachfront event tent with ocean view', NULL, 31),
('photos', 'images', 'flyer.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/flyer.jpg', 'Pacific North Events & Tents promotional flyer', NULL, 32),
('catering_callout', 'images', '469312785_529823293388786_3537228070558775988_n.jpg', 'https://ecaqbqrsifzblifbntls.supabase.co/storage/v1/object/public/images/469312785_529823293388786_3537228070558775988_n.jpg', 'Catering buffet table with food spread', NULL, 0);
