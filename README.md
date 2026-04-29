# Abastece Certo

App mobile para iOS e Android que registra abastecimentos, calcula o preco real por litro e ajuda o motorista a descobrir os postos mais baratos com base no proprio historico.

## Stack

- Expo
- React Native
- TypeScript
- dominio em OO com classes de calculo, factories e servicos
- validacoes com early return nos fluxos de cadastro e registro
- AsyncStorage para persistencia local
- Expo Location para sugestao de posto por GPS

## MVP implementado

- cadastro simples de usuario
- cadastro e selecao de varios carros por placa
- registro rapido de abastecimento
- registro em data retroativa e edicao pela lista de abastecimentos
- calculo automatico de R$/litro
- filtro global por combinacao de carros
- sugestao de posto por GPS entre postos cadastrados
- correcao manual do posto
- lista de abastecimentos
- dashboard com gasto mensal, medias por combustivel e economia potencial
- ranking pessoal dos postos mais baratos
- tela Abastecimentos com mapa pessoal e lista editavel
- dados fake iniciais para testar o app com historico preenchido

## Rodar o app

```bash
npm install
npm start
```

Para emulador Android/iOS, abra o app pelo menu do Expo. Para celular fisico, use o Expo Go e rode com host LAN se necessario:

```bash
npm start -- --host lan
```

## Scripts

```bash
npm run typecheck
npm run android
npm run ios
```

## Observacoes

Esta versao nao inclui backend nem autenticacao remota. Os dados ficam salvos localmente no aparelho, o que e adequado para validar o fluxo do MVP antes de evoluir para contas, sincronizacao e um cadastro real de postos.
