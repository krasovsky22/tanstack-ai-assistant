import { toolDefinition } from '@tanstack/ai';
import { z } from 'zod';

type WeatherUnits = 'standard' | 'metric' | 'imperial';

type WeatherCondition = {
  id: number;
  main: string;
  description: string;
  icon: string;
};

type CurrentWeatherResponse = {
  coord: {
    lon: number;
    lat: number;
  };
  weather?: WeatherCondition[];
  main: {
    temp: number;
    feels_like: number;
    pressure: number;
    humidity: number;
    temp_min?: number;
    temp_max?: number;
    sea_level?: number;
    grnd_level?: number;
  };
  visibility?: number;
  wind?: {
    speed?: number;
    deg?: number;
    gust?: number;
  };
  clouds?: {
    all?: number;
  };
  rain?: {
    '1h'?: number;
    '3h'?: number;
  };
  snow?: {
    '1h'?: number;
    '3h'?: number;
  };
  dt: number;
  sys?: {
    country?: string;
    sunrise?: number;
    sunset?: number;
  };
  timezone?: number;
  id?: number;
  name?: string;
  cod?: number;
};

const getWeatherInputSchema = z.object({
  location: z
    .string()
    .trim()
    .min(1)
    .describe(
      'City or place name, for example: "London", "Berlin,DE", "New York"',
    )
    .optional(),
  lat: z.preprocess(
    (value) => (value === null ? undefined : value),
    z
      .number()
      .min(-90)
      .max(90)
      .describe('Latitude. Use with lon when coordinates are available.')
      .optional(),
  ),
  lon: z.preprocess(
    (value) => (value === null ? undefined : value),
    z
      .number()
      .min(-180)
      .max(180)
      .describe('Longitude. Use with lat when coordinates are available.')
      .optional(),
  ),
  units: z
    .enum(['standard', 'metric', 'imperial'])
    .describe(
      'Units for temperature and wind. standard=K, metric=°C, imperial=°F',
    )
    .optional(),
  lang: z
    .string()
    .trim()
    .min(2)
    .describe(
      'Optional language code for weather descriptions, e.g. en, pl, de.',
    )
    .optional(),
});

export const getWeatherTool = toolDefinition({
  name: 'get_weather',
  description:
    'Get current weather for a location using OpenWeather Current Weather API. Use this whenever the user asks about weather.',
  inputSchema: getWeatherInputSchema,
}).server(async (input) => {
  const parsedInput = getWeatherInputSchema.parse(input);
  const apiKey = process.env.OPEN_WEATHER_API;

  if (!apiKey) {
    return {
      error: 'OPEN_WEATHER_API is not configured on the server.',
    };
  }

  const units: WeatherUnits = parsedInput.units ?? 'metric';

  let lat = parsedInput.lat;
  let lon = parsedInput.lon;
  let resolvedName = parsedInput.location?.trim();

  try {
    if (lat == null || lon == null) {
      if (!resolvedName) {
        return {
          error:
            'Missing location. Provide a city/place name or both lat and lon coordinates.',
        };
      }

      const geocodingUrl = new URL(
        'https://api.openweathermap.org/geo/1.0/direct',
      );
      geocodingUrl.searchParams.set('q', resolvedName);
      geocodingUrl.searchParams.set('limit', '1');
      geocodingUrl.searchParams.set('appid', apiKey);

      const geocodingRes = await fetch(geocodingUrl);
      if (!geocodingRes.ok) {
        return {
          error: `Geocoding failed with status ${geocodingRes.status}.`,
        };
      }

      const geocodingData = (await geocodingRes.json()) as Array<{
        name: string;
        lat: number;
        lon: number;
        country?: string;
        state?: string;
      }>;

      const first = geocodingData[0];
      if (!first) {
        return {
          error: `Could not find coordinates for "${resolvedName}".`,
        };
      }

      lat = first.lat;
      lon = first.lon;
      resolvedName = [first.name, first.state, first.country]
        .filter(Boolean)
        .join(', ');
    }

    const weatherUrl = new URL(
      'https://api.openweathermap.org/data/2.5/weather',
    );
    weatherUrl.searchParams.set('lat', String(lat));
    weatherUrl.searchParams.set('lon', String(lon));
    weatherUrl.searchParams.set('units', units);
    weatherUrl.searchParams.set('appid', apiKey);

    if (parsedInput.lang) {
      weatherUrl.searchParams.set('lang', parsedInput.lang);
    }

    console.log('Fetching weather with URL:', weatherUrl.toString());
    const weatherRes = await fetch(weatherUrl);

    if (!weatherRes.ok) {
      const errorBody = await weatherRes.text();
      return {
        error: `Weather API request failed with status ${weatherRes.status}: ${errorBody}`,
      };
    }

    const weather = (await weatherRes.json()) as CurrentWeatherResponse;

    const unitLabel =
      units === 'metric'
        ? { temperature: '°C', windSpeed: 'm/s' }
        : units === 'imperial'
          ? { temperature: '°F', windSpeed: 'mph' }
          : { temperature: 'K', windSpeed: 'm/s' };

    return {
      location: {
        name:
          resolvedName ??
          [weather.name, weather.sys?.country].filter(Boolean).join(', ') ??
          `${weather.coord.lat}, ${weather.coord.lon}`,
        lat: weather.coord.lat,
        lon: weather.coord.lon,
        timezoneOffset: weather.timezone,
      },
      units,
      unitLabel,
      current: {
        dt: weather.dt,
        temp: weather.main.temp,
        feelsLike: weather.main.feels_like,
        tempMin: weather.main.temp_min,
        tempMax: weather.main.temp_max,
        pressure: weather.main.pressure,
        humidity: weather.main.humidity,
        seaLevelPressure: weather.main.sea_level,
        groundLevelPressure: weather.main.grnd_level,
        visibility: weather.visibility,
        windSpeed: weather.wind?.speed,
        windDeg: weather.wind?.deg,
        windGust: weather.wind?.gust,
        clouds: weather.clouds?.all,
        rain1h: weather.rain?.['1h'],
        rain3h: weather.rain?.['3h'],
        snow1h: weather.snow?.['1h'],
        snow3h: weather.snow?.['3h'],
        sunrise: weather.sys?.sunrise,
        sunset: weather.sys?.sunset,
        weather: weather.weather?.[0] ?? null,
      },
    };
  } catch (error) {
    return {
      error:
        error instanceof Error
          ? `Unexpected weather tool error: ${error.message}`
          : 'Unexpected weather tool error.',
    };
  }
});
