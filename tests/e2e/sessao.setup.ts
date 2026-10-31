import { mkdir, writeFile } from 'node:fs/promises';
import { dirname } from 'node:path';

import { test as setup } from '@playwright/test';
import { createServerClient } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

import { definirPersonagemDoUsuarioDeTeste } from './apoio/banco-local';
import { ARQUIVO_SESSAO, ARQUIVO_TOKEN } from './apoio/caminhos';
import { EMAIL_TESTE, lerSupabaseLocal } from './apoio/supabase-local';

/**
 * Cria (se preciso) o usuário de teste no Supabase local, abre uma sessão pela
 * API admin (o login real pelo GitHub não é automatizável) e grava os cookies
 * no formato do `@supabase/ssr`, que o app lê. Também apaga as Missões que
 * sobraram de execuções anteriores e dá uma Classe ao personagem, para cada
 * execução começar do mesmo ponto.
 */
setup('sessão do usuário de teste', async () => {
  const { url, chavePublica, chaveSecreta } = lerSupabaseLocal();
  const admin = createClient(url, chaveSecreta, { auth: { persistSession: false, autoRefreshToken: false } });

  const { error: erroCriacao } = await admin.auth.admin.createUser({
    email: EMAIL_TESTE,
    email_confirm: true,
  });
  if (erroCriacao && erroCriacao.code !== 'email_exists') throw erroCriacao;

  const { data: link, error: erroLink } = await admin.auth.admin.generateLink({
    type: 'magiclink',
    email: EMAIL_TESTE,
  });
  if (erroLink) throw erroLink;
  const publico = createClient(url, chavePublica, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: sessao, error: erroVerificacao } = await publico.auth.verifyOtp({
    type: 'magiclink',
    token_hash: link.properties.hashed_token,
  });
  if (erroVerificacao || !sessao.session) throw erroVerificacao ?? new Error('Sessão de teste não criada.');

  const cookies: { name: string; value: string }[] = [];
  const cliente = createServerClient(url, chavePublica, {
    cookies: {
      getAll: () => [],
      setAll: (lista) => {
        cookies.push(...lista.filter((cookie) => cookie.value));
      },
    },
  });
  const { error: erroSessao } = await cliente.auth.setSession(sessao.session);
  if (erroSessao) throw erroSessao;

  // Limpeza com a própria sessão do usuário: o RLS só deixa apagar o que é dele.
  const comoUsuario = createClient(url, chavePublica, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${sessao.session.access_token}` } },
  });
  const { error: erroLimpeza } = await comoUsuario.from('projetos').delete().not('id', 'is', null);
  if (erroLimpeza) throw erroLimpeza;
  // Sem Classe, toda tela do jogo manda para a escolha (RF-17): os specs
  // começam com uma; o do 1º acesso a apaga e devolve.
  definirPersonagemDoUsuarioDeTeste({ classe: 'arquimago_dados' });

  await mkdir(dirname(ARQUIVO_SESSAO), { recursive: true });
  await writeFile(
    ARQUIVO_SESSAO,
    JSON.stringify({
      cookies: cookies.map(({ name, value }) => ({
        name,
        value,
        domain: '127.0.0.1',
        path: '/',
        expires: -1,
        httpOnly: false,
        secure: false,
        sameSite: 'Lax',
      })),
      origins: [],
    }),
  );
  await writeFile(ARQUIVO_TOKEN, JSON.stringify({ accessToken: sessao.session.access_token }));
});
