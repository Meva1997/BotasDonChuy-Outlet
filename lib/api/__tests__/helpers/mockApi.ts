import { AxiosError, AxiosHeaders } from "axios";
import type { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import { api } from "../../client";

/**
 * Doble de transporte para la instancia axios REAL de `lib/api/client.ts`.
 *
 * Se reemplaza el `adapter` (la última capa, la que de verdad hablaría con la
 * red) en vez de mockear el módulo `client` entero con `jest.mock`. La diferencia
 * importa: así los interceptores de petición y respuesta —el Bearer, el cierre de
 * sesión en 401, `skipAuth`/`skipAuthRedirect`— corren de verdad en cada suite de
 * `lib/api/`, y `client.test.ts` puede ejercitarlos sin un arnés aparte. Mockear
 * el módulo los saltaría por completo y dejaría sin probar justamente la única
 * lógica no trivial de la capa.
 *
 * Cada suite instala el doble en `beforeEach` y lo desinstala en `afterEach`
 * (`installMockApi()` devuelve el control); la instancia es un singleton de
 * módulo, así que dejarla parchada contaminaría las demás suites.
 */

/** Lo que el transporte vio salir, ya con interceptores aplicados. */
export interface ApiCall {
  /** Siempre en minúsculas ("get", "post", …). */
  method: string;
  /** Ruta relativa tal como la escribió el fetcher (sin `baseURL`). */
  url: string;
  /** `config.params` de axios (los `undefined` los omite axios al serializar). */
  params: Record<string, unknown> | undefined;
  /**
   * Cuerpo ya des-serializado. axios corre `transformRequest` ANTES del adapter,
   * así que a esta capa el objeto llega como string JSON; se re-parsea para que
   * las aserciones se escriban sobre el objeto y no sobre su texto.
   * `undefined` cuando la petición no llevó cuerpo (GET/DELETE).
   */
  body: unknown;
  /** Cabeceras finales de la petición (incluye las que puso el interceptor). */
  headers: Record<string, unknown>;
  /** Config cruda, para aserciones sobre banderas propias (`skipAuth`, …). */
  config: InternalAxiosRequestConfig;
}

type Reply =
  | { kind: "ok"; status: number; data: unknown; headers: Record<string, string> }
  | { kind: "http"; status: number; data: unknown }
  | { kind: "network" };

export interface MockApi {
  /** Encola una respuesta exitosa. Encadenable para varias peticiones seguidas. */
  ok(data?: unknown, opts?: { status?: number; headers?: Record<string, string> }): MockApi;
  /** Encola un error CON respuesta del servidor (4xx/5xx). */
  httpError(status: number, data?: unknown): MockApi;
  /** Encola un fallo sin respuesta: la petición nunca llegó (red caída/timeout). */
  networkError(): MockApi;
  /** Todas las peticiones que salieron, en orden. */
  calls: ApiCall[];
  /** La última petición. Falla con un mensaje claro si no hubo ninguna. */
  lastCall(): ApiCall;
  /** Restaura el adapter original. Llamar siempre en `afterEach`. */
  restore(): void;
}

function toApiCall(config: InternalAxiosRequestConfig): ApiCall {
  let body: unknown;
  if (typeof config.data === "string") {
    try {
      body = JSON.parse(config.data);
    } catch {
      // Un cuerpo no-JSON (p. ej. el FormData de la importación) se deja crudo:
      // esas suites asertan sobre la instancia, no sobre su contenido parseado.
      body = config.data;
    }
  } else {
    body = config.data;
  }
  return {
    method: (config.method ?? "get").toLowerCase(),
    url: config.url ?? "",
    params: config.params,
    body,
    headers: AxiosHeaders.from(config.headers).toJSON() as Record<string, unknown>,
    config,
  };
}

export function installMockApi(): MockApi {
  const original = api.defaults.adapter;
  const queue: Reply[] = [];
  const calls: ApiCall[] = [];

  api.defaults.adapter = async (config: InternalAxiosRequestConfig) => {
    calls.push(toApiCall(config));
    const reply = queue.shift();
    if (!reply) {
      // Una petición no encolada casi siempre significa que el fetcher hizo una
      // llamada de más (o que la suite olvidó encolar). Se falla ruidosamente en
      // vez de colgar la promesa, que se vería como un timeout sin explicación.
      throw new Error(
        `mockApi: petición sin respuesta encolada → ${config.method?.toUpperCase()} ${config.url}`
      );
    }
    if (reply.kind === "network") {
      throw new AxiosError("Network Error", AxiosError.ERR_NETWORK, config, {});
    }
    const response: AxiosResponse = {
      data: reply.kind === "ok" ? reply.data : reply.data,
      status: reply.status,
      statusText: "",
      headers: reply.kind === "ok" ? reply.headers : {},
      config,
    };
    if (reply.kind === "http") {
      throw new AxiosError(
        `Request failed with status code ${reply.status}`,
        AxiosError.ERR_BAD_REQUEST,
        config,
        {},
        response
      );
    }
    return response;
  };

  const mock: MockApi = {
    ok(data: unknown = {}, opts = {}) {
      queue.push({
        kind: "ok",
        status: opts.status ?? 200,
        data,
        headers: opts.headers ?? {},
      });
      return mock;
    },
    httpError(status: number, data: unknown = {}) {
      queue.push({ kind: "http", status, data });
      return mock;
    },
    networkError() {
      queue.push({ kind: "network" });
      return mock;
    },
    calls,
    lastCall() {
      const last = calls[calls.length - 1];
      if (!last) throw new Error("mockApi: no salió ninguna petición");
      return last;
    },
    restore() {
      api.defaults.adapter = original;
    },
  };

  return mock;
}
