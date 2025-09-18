import React from 'react';

interface VolumeVisualizerProps {
  volume: number; // A value between 0 and 1
}

const VolumeVisualizer: React.FC<VolumeVisualizerProps> = ({ volume }) => {
  // 增加長條數量以獲得更多細節
  const barCount = 9;

  // 放大傳入的音量，讓較安靜的聲音也清晰可見
  const amplifiedVolume = Math.min(1, volume * 2.5);

  const getBarHeights = () => {
    const heights = [];
    // 增加最大高度以獲得更大的動態範圍
    const baseHeight = 4;
    const maxHeight = 36; 

    for (let i = 0; i < barCount; i++) {
      // 計算長條與中心的距離，這會影響反應性
      const distanceFromCenter = Math.abs(i - Math.floor(barCount / 2));
      // 中心的長條反應更靈敏，外部的則較緩
      const reactivity = 1 - (distanceFromCenter / (barCount / 2)) * 0.7;
      
      // 根據放大後的音量計算核心高度
      let height = baseHeight + (maxHeight - baseHeight) * amplifiedVolume * reactivity;
      
      // 增加少量隨機抖動，使其感覺更「生動」
      if (amplifiedVolume > 0.05) {
          height += (Math.random() - 0.5) * 6 * amplifiedVolume;
      }
      
      // 確保高度不低於基礎高度
      heights.push(Math.max(baseHeight, height));
    }
    return heights;
  };

  const barHeights = getBarHeights();

  return (
    // 增加容器高度至 h-10 (40px)
    <div className="flex items-end justify-center space-x-1 h-10" aria-label="Audio volume level">
      {barHeights.map((height, index) => (
        <div
          key={index}
          // 使用 w-1 讓長條稍微變細，以容納更多長條
          className="w-1 bg-green-400 rounded-full transition-all duration-75 ease-out"
          style={{ height: `${height}px` }}
        ></div>
      ))}
    </div>
  );
};

export default VolumeVisualizer;
