// src/app/services/location.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map, Observable } from 'rxjs';

export interface IpLocation {
  lat: number;
  lon: number;
  city?: string;
  region?: string;
  country?: string;
}

@Injectable({
  providedIn: 'root',
})
export class LocationService {
  constructor(private http: HttpClient) {}

  getIpLocation(): Observable<IpLocation> {
    return this.http.get<any>('/api/ip-location').pipe(
      map((res) => ({
        lat: res.lat,
        lon: res.lon,
        city: res.city,
        region: res.region,
        country: res.country,
      }))
    );
  }
}
