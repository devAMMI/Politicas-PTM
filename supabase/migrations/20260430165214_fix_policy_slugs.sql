/*
  # Fix policy slugs

  Some existing policies have malformed slugs where the first letter of
  each accented word was stripped (e.g., "olitica-de-alidad" instead of
  "politica-de-calidad"). This migration corrects all slug values using
  a proper slugification approach in SQL.
*/

UPDATE policies SET slug = (
  regexp_replace(
    regexp_replace(
      regexp_replace(
        lower(
          -- Remove accents using translate
          translate(
            title,
            'ÁÉÍÓÚáéíóúÑñÜüÀÈÌÒÙàèìòùÂÊÎÔÛâêîôû',
            'AEIOUaeiouNnUuAEIOUaeiouAEIOUaeiou'
          )
        ),
        '[^a-z0-9\s-]', '', 'g'
      ),
      '\s+', '-', 'g'
    ),
    '-+', '-', 'g'
  ) || '-' || substring(replace(id::text, '-', ''), 1, 6)
)
WHERE id IN (
  '6487303b-5553-4ea7-a2e8-7d0224a6c81d',
  '68f28b70-449a-41d3-9eb5-8d45af3e057e',
  'af793d36-37f4-4a45-b484-4a78f1523ec7',
  '46f7984f-209f-45f6-96f6-0d965c9e6d0c',
  '2c4048e9-a2b0-47d9-ba6d-adad7d33dcd5'
);
