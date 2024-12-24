import React, { useEffect, useState } from 'react';
import { FaSpotify } from 'react-icons/fa';
import { GiGamepad } from 'react-icons/gi';

interface LanyardData {
  active_on_discord_mobile: boolean;
  active_on_discord_desktop: boolean;
  listening_to_spotify: boolean;
  kv: {
    location: string;
  };
  spotify: {
    track_id: string;
    timestamps: {
      start: number;
      end: number;
    };
    song: string;
    artist: string;
    album_art_url: string;
    album: string;
  } | null;
  discord_user: {
    username: string;
    public_flags: number;
    id: string;
    discriminator: string;
    avatar: string;
    avatar_decoration_data?: {
      asset: string;
    };
  };
  discord_status: string;
  activities: Array<{
    type: number;
    name: string;
    application_id?: string;
    details?: string;
    state?: string;
    timestamps?: {
      start: number;
      end?: number;
    };
    assets?: {
      large_image?: string;
      large_text?: string;
      small_image?: string;
      small_text?: string;
    };
  }>;
}

const Lanyard: React.FC = () => {
  const [data, setData] = useState<LanyardData | null>(null);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [lastListeningActivity, setLastListeningActivity] = useState<{ song: string; albumArt: string; artist: string } | null>(null);
  const [lastActivity, setLastActivity] = useState<{
    name: string;
    details?: string;
    state?: string;
    largeImage?: string;
    smallImage?: string;
    applicationId?: string;
  } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch(`https://api.lanyard.rest/v1/users/212702039103373312`, {
          headers: {
            'Authorization': '77b1046fa55ce8b2af7928f1e43f37f8'
          }
        });
        const result = await response.json();
        if (result.success) {
          setData(result.data);
        }
      } catch (error) {
        console.error('Error fetching Lanyard data:', error);
      }
    };

    fetchData();

    const socket = new WebSocket('wss://api.lanyard.rest/socket');

    socket.onopen = () => {
      console.log('WebSocket connection opened');
      socket.send(JSON.stringify({
        op: 2,
        d: {
          subscribe_to_id: "212702039103373312"
        }
      }));
    };

    socket.onmessage = (event) => {
      const message = JSON.parse(event.data);
      if (message.op === 0 && message.t === 'INIT_STATE') {
        setData(message.d);
      } else if (message.op === 0 && message.t === 'PRESENCE_UPDATE') {
        setData(message.d);
      }
    };

    socket.onclose = () => {
      console.log('WebSocket connection closed');
    };

    return () => {
      socket.close();
    };
  }, []);

  useEffect(() => {
    let interval: ReturnType<typeof setInterval>;
    if (data?.spotify) {
      interval = setInterval(() => {
        setCurrentTime(Date.now() - data.spotify!.timestamps.start);
      }, 1000); // Update every second
    }
    return () => clearInterval(interval);
  }, [data?.spotify]);

  useEffect(() => {
    if (data?.listening_to_spotify && data.spotify) {
      const { song, album_art_url, artist } = data.spotify;
      if (lastListeningActivity?.song !== song) {
        setLastListeningActivity({ song, albumArt: album_art_url, artist });
      }
    }
  }, [data?.listening_to_spotify, data?.spotify, lastListeningActivity]);

  useEffect(() => {
    const storedLastActivity = localStorage.getItem('lastActivity');
    if (storedLastActivity) {
      setLastActivity(JSON.parse(storedLastActivity));
    }
  }, []);

  useEffect(() => {
    const currentActivity = data?.activities.find(activity => activity.type === 0) as LanyardData['activities'][0] | undefined;
    if (currentActivity) {
      const newLastActivity = {
        name: currentActivity.name,
        details: currentActivity.details,
        state: currentActivity.state,
        largeImage: currentActivity.assets?.large_image,
        smallImage: currentActivity.assets?.small_image,
        applicationId: currentActivity.application_id,
      };
      setLastActivity(newLastActivity);
      localStorage.setItem('lastActivity', JSON.stringify(newLastActivity));
    }
  }, [data?.activities]);

  if (!data) {
    return <div>Loading...</div>;
  }

  const currentActivity = data.activities.find(activity => activity.type === 0) as LanyardData['activities'][0] | undefined;

  const displayLastListeningActivity = !data.listening_to_spotify && lastListeningActivity;
  const displayLastActivity = !currentActivity && lastActivity;

  const getSongProgress = () => {
    if (data.spotify) {
      const { start, end } = data.spotify.timestamps;
      const progress = ((currentTime) / (end - start)) * 100;
      return Math.min(progress, 100).toFixed(2); // Ensure progress doesn't exceed 100%
    }
    return null;
  };

  const formatTime = (milliseconds: number) => {
    const minutes = Math.floor(milliseconds / 60000);
    const seconds = ((milliseconds % 60000) / 1000).toFixed(0);
    return `${minutes}:${seconds.padStart(2, '0')}`;
  };

  const songProgress = getSongProgress();
  const totalTime = data.spotify ? data.spotify.timestamps.end - data.spotify.timestamps.start : 0;

  return (
    <div>
      {data.listening_to_spotify && data.spotify && (
        <div className="bg-black bg-opacity-30 p-2 rounded-lg mb-2">
          <div className="flex items-start justify-start">
            <h2 className="text-white text-sm flex items-center mb-1">
              Listening to Spotify <FaSpotify className="ml-1 pb-1 w-4 h-4" />
            </h2>
          </div>
          <div className="flex items-center">
            <img src={data.spotify.album_art_url} alt={data.spotify.album} className="rounded-md w-14 h-14 mr-2" />
            <div className="flex flex-col justify-center flex-grow mt-[-10px]">
              <p className="text-gray-300 font-bold pt-[10px]">{data.spotify.song}</p>
              <p className="text-gray-300 text-sm mt-[-4px]">{data.spotify.artist}</p>
              {songProgress && (
                <div className="flex items-center mt-1">
                  <span className="text-gray-300 text-xs">{formatTime(currentTime)}</span>
                  <div className="flex-grow bg-gray-300 rounded-full h-1 mx-2">
                    <div
                      className="bg-white h-1 rounded-full"
                      style={{ width: `${songProgress}%` }}
                    ></div>
                  </div>
                  <span className="text-gray-300 text-xs">{formatTime(totalTime)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {displayLastListeningActivity && (
        <div className="bg-black bg-opacity-30 p-2 rounded-lg mb-2">
          <div className="flex items-start justify-start">
            <h2 className="text-white text-sm flex items-center mb-1">
              Last Listening Activity
            </h2>
          </div>
          <div className="flex items-center">
            <img src={lastListeningActivity.albumArt} alt="Album Art" className="rounded-md w-14 h-14 mr-2" />
            <div className="flex flex-col justify-center flex-grow">
              <p className="text-gray-300 font-bold">{lastListeningActivity.song}</p>
              <p className="text-gray-300 text-sm">{lastListeningActivity.artist}</p>
            </div>
          </div>
        </div>
      )}

      {displayLastActivity && (
        <div className="bg-black bg-opacity-30 p-2 rounded-lg mb-2">
          <div className="flex items-start justify-start">
            <h2 className="text-white text-sm flex items-center mb-1">
              Last Activity
            </h2>
          </div>
          <div className="flex items-center relative">
            {lastActivity.largeImage && lastActivity.applicationId && (
              <div className="relative">
                <img 
                  src={`https://cdn.discordapp.com/app-assets/${lastActivity.applicationId}/${lastActivity.largeImage}.png`} 
                  alt="Large Image" 
                  className="rounded-md w-14 h-14 mr-2"
                />
                {lastActivity.smallImage && (
                  <img 
                    src={`https://cdn.discordapp.com/app-assets/${lastActivity.applicationId}/${lastActivity.smallImage}.png`} 
                    alt="Small Image" 
                    className="absolute bottom-[-5px] right-0 w-5 h-5 rounded-full border border-transparent"
                  />
                )}
              </div>
            )}
            <div className="flex flex-col justify-center flex-grow">
              <p className="text-gray-300 font-bold">{lastActivity.name}</p>
              {lastActivity.details && <p className="text-gray-300 text-sm mt-[-4px]">{lastActivity.details}</p>}
              {lastActivity.state && <p className="text-gray-300 text-sm mt-[-4px]">{lastActivity.state}</p>}
            </div>
          </div>
        </div>
      )}

      {currentActivity && (
        <div className="bg-black bg-opacity-30 p-2 rounded-lg mb-2">
          <div className="flex items-start justify-start">
            <h2 className="text-white text-sm flex items-center mb-1">
              Currently Playing <GiGamepad className="ml-[2px] pb-1 w-5 h-5" />
            </h2>
          </div>
          <div className="flex items-center relative">
            {currentActivity.assets?.large_image && (
              <div className="relative">
                <img 
                  src={`https://cdn.discordapp.com/app-assets/${currentActivity.application_id}/${currentActivity.assets.large_image}.png`} 
                  alt={currentActivity.assets.large_text || 'Large Image'} 
                  className="rounded-md w-14 h-14 mr-2"
                />
                {currentActivity.assets?.small_image && (
                  <img 
                    src={`https://cdn.discordapp.com/app-assets/${currentActivity.application_id}/${currentActivity.assets.small_image}.png`} 
                    alt={currentActivity.assets.small_text || 'Small Image'} 
                    className="absolute bottom-[-5px] right-0 w-5 h-5 rounded-full border border-transparent"
                  />
                )}
              </div>
            )}
            <div className="flex flex-col justify-center flex-grow">
              <p className="text-gray-300 font-bold">{currentActivity.name}</p>
              {currentActivity.details && <p className="text-gray-300 text-sm mt-[-4px]">{currentActivity.details}</p>}
              {currentActivity.state && <p className="text-gray-300 text-sm mt-[-4px]">{currentActivity.state}</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Lanyard;