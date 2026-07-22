import { useEffect, RefObject } from 'react';

/**
 * 统一绑定 audio/video 元素的 play/pause/ended 事件
 * @param mediaRef audio/video 元素的 ref
 * @param setIsPlaying 播放状态 setter
 * @param onEnded 播放结束时的额外回调（可选）
 */
export function useMediaEvents(
  mediaRef: RefObject<HTMLAudioElement | HTMLVideoElement | null>,
  setIsPlaying: (value: boolean) => void,
  onEnded?: () => void
) {
  useEffect(() => {
    const media = mediaRef.current;
    if (!media) return;

    const handlePlay = () => setIsPlaying(true);
    const handlePause = () => setIsPlaying(false);
    const handleEnded = () => {
      setIsPlaying(false);
      onEnded?.();
    };

    media.addEventListener('play', handlePlay);
    media.addEventListener('pause', handlePause);
    media.addEventListener('ended', handleEnded);

    return () => {
      media.removeEventListener('play', handlePlay);
      media.removeEventListener('pause', handlePause);
      media.removeEventListener('ended', handleEnded);
    };
  }, [mediaRef, setIsPlaying, onEnded]);
}
