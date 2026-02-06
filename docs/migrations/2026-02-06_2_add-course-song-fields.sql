-- Add Song, Singer, and Video Link fields to courses table
-- Created: 2026-02-06
-- Description: Extends courses table with song information for class content

-- Add new columns to courses table
ALTER TABLE courses 
  ADD COLUMN song TEXT,
  ADD COLUMN singer TEXT,
  ADD COLUMN video_link TEXT;

-- Add comment for documentation
COMMENT ON COLUMN courses.song IS 'Name of the song/choreography taught in this course';
COMMENT ON COLUMN courses.singer IS 'Artist/singer of the song';
COMMENT ON COLUMN courses.video_link IS 'URL to the video reference for the choreography';
