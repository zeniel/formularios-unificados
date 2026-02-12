# Documentação de negócio: periodicidade de preenchimento dos questionários

Este documento descreve as regras de negócio relativas à **periodicidade de preenchimento** dos questionários e ao uso dos campos **Dia limite** e **Mês limite** na configuração de cada questionário.

---

## 1. Conceitos

- **Periodicidade (tipo de prazo)**: Define com que frequência o questionário é preenchido — mensal, semestral, anual ou trimestral. Cada questionário possui uma periodicidade.
- **Período de referência**: Intervalo de tempo (mês, semestre, trimestre ou ano) ao qual as respostas do questionário se referem. Ex.: “Janeiro/2025”, “1º Semestre/2025”.
- **Data limite para preenchimento**: Última data em que o usuário pode enviar respostas referentes a um determinado período. Enquanto a data atual for menor ou igual a essa data, o prazo está **ativo** para aquele período.
- **Dia limite** e **Mês limite**: Campos de configuração do questionário usados para calcular a data limite, conforme a periodicidade (detalhes abaixo).

---

## 2. Tipos de periodicidade

O sistema utiliza quatro tipos de periodicidade, identificados numericamente:

| Código | Nome        | Descrição resumida                                      |
|--------|-------------|---------------------------------------------------------|
| 1      | **Mensal**  | Um período por mês; prazo no mês seguinte.              |
| 2      | **Semestral** | Um período por semestre (jan–jun ou jul–dez); prazo no 1º mês do semestre seguinte. |
| 3      | **Anual**   | Um período por ano civil; prazo em mês/ano configurados. |
| 4      | **Trimestral** | Um período por trimestre (jan–mar, abr–jun, jul–set, out–dez); prazo no 1º mês do trimestre seguinte. |

**Definição de semestres e trimestres:**

- **1º semestre:** janeiro a junho. **2º semestre:** julho a dezembro.
- **1º trimestre:** janeiro a março. **2º:** abril a junho. **3º:** julho a setembro. **4º:** outubro a dezembro.

---

## 3. Uso dos campos Dia limite e Mês limite

Os campos **Dia limite** (numérico, 1–31) e **Mês limite** (numérico, 1–12) são gravados no cadastro do questionário e usados no cálculo da **data limite para preenchimento**. O comportamento depende do tipo de periodicidade.

### 3.1. Regra geral do Dia limite

- O sistema usa o **Dia limite** como dia do mês em que termina o prazo.
- Se o Dia limite não for informado ou for inválido (fora do intervalo 1–31), é usado o **último dia do mês** em que cai a data limite.
- Se o Dia limite for 28, 29, 30 ou 31, o sistema ajusta automaticamente para o **último dia real do mês** (ex.: em fevereiro vira 28 ou 29).

### 3.2. Regra do Mês limite por periodicidade

O **Mês limite** só é utilizado explicitamente na periodicidade **Anual**. Nas demais, o mês em que cai a data limite é derivado da data de cálculo e do tipo de prazo.

---

## 4. Regras por tipo de periodicidade

### 4.1. Mensal (código 1)

- **Período de referência:** um mês (ex.: Janeiro/2025).
- **Quando o prazo está aberto:** o período considerado é o **mês anterior** à data de cálculo, e a data limite é no **próprio mês da data de cálculo**.

**Dia limite**

- Define o **dia do mês** em que termina o prazo.
- O **mês** da data limite é sempre o mês da “data de cálculo” (ex.: se hoje é 15/02/2025, o mês da data limite é fevereiro).
- Ex.: Dia limite = 10 → prazo do período “Janeiro/2025” termina em **10/02/2025**.

**Mês limite**

- **Não é utilizado** no cálculo para periodicidade mensal. O mês da data limite é sempre o mês atual (data de cálculo).

**Exemplo**

- Data de cálculo: 15/02/2025. Dia limite: 10.  
- Data limite = 10/02/2025.  
- Período de referência em aberto = Janeiro/2025 (mês anterior).  
- Como 15/02 ≤ 10/02 é falso, o prazo de Janeiro/2025 já estaria encerrado; o próximo período em que o prazo ainda estaria ativo seria Fevereiro/2025 (data limite 10/03/2025).

---

### 4.2. Semestral (código 2)

- **Período de referência:** um semestre (Jan–Jun ou Jul–Dez).
- A data limite para preenchimento cai no **primeiro mês do semestre seguinte** ao período de referência.

**Dia limite**

- Define o **dia** dessa data limite (no primeiro mês do semestre seguinte).
- Ex.: período 1º semestre/2025 (jan–jun) → data limite em **julho/2025**; o dia será o Dia limite (ou último dia de julho, conforme regra geral).

**Mês limite**

- **Não é utilizado** no cálculo para periodicidade semestral. O mês da data limite é sempre:
  - **Julho** (mês 7) quando o período de referência é o 1º semestre (jan–jun);
  - **Janeiro** (mês 1) do ano seguinte quando o período é o 2º semestre (jul–dez).

**Exemplo**

- Data de cálculo: 15/08/2025. Dia limite: 31.  
- O sistema calcula a data limite do período que está “em vigor”: semestre da data de cálculo = 2º (jul–ago), primeiro mês desse semestre = **julho**. Data limite calculada = 31/07/2025 (prazo do 1º semestre/2025).  
- Como 15/08 > 31/07, o prazo do 1º semestre/2025 já encerrou. O período atual em preenchimento passa a ser o **2º semestre/2025** (jul–dez), cuja data limite será **31/01/2026** (primeiro mês do semestre seguinte).

---

### 4.3. Anual (código 3)

- **Período de referência:** ano civil (Janeiro a Dezembro).
- A data limite para preenchimento é no **ano seguinte** ao período de referência, no **mês e dia** configurados.

**Dia limite**

- Define o **dia** do mês em que termina o prazo (no mês configurado pelo Mês limite, no ano seguinte ao período de referência).

**Mês limite**

- Define o **mês** (1 a 12) em que termina o prazo.
- Ex.: Mês limite = 3, Dia limite = 15 → prazo do período “Ano 2024” termina em **15/03/2025**.
- Se o Mês limite não for informado ou for inválido, o sistema utiliza **janeiro (1)**.

**Exemplo**

- Período de referência: Ano 2024. Mês limite: 4. Dia limite: 30.  
- Data limite = **30/04/2025**.  
- Enquanto a data atual for ≤ 30/04/2025, o questionário do ano 2024 está em prazo.

---

### 4.4. Trimestral (código 4)

- **Período de referência:** um trimestre (Jan–Mar, Abr–Jun, Jul–Set, Out–Dez).
- A data limite para preenchimento cai no **primeiro mês do trimestre seguinte** ao período de referência.

**Dia limite**

- Define o **dia** dessa data limite (no primeiro mês do trimestre seguinte).
- Ex.: período 1º trimestre/2025 (jan–mar) → data limite em **abril/2025**; o dia será o Dia limite (ou último dia de abril, conforme regra geral).

**Mês limite**

- **Não é utilizado** no cálculo para periodicidade trimestral. O mês da data limite é sempre o primeiro mês do trimestre seguinte:
  - 1º trimestre (jan–mar) → **abril** (4);
  - 2º trimestre (abr–jun) → **julho** (7);
  - 3º trimestre (jul–set) → **outubro** (10);
  - 4º trimestre (out–dez) → **janeiro** (1) do ano seguinte.

**Exemplo**

- Data de cálculo: 20/05/2025. Dia limite: 15.  
- Trimestre da data de cálculo = 2º (abr–mai).  
- Mês da data limite = primeiro mês do 2º trimestre = **abril**. Data limite = 15/04/2025.  
- Período de referência em que o prazo ainda está ativo = 1º trimestre/2025 (jan–mar).  
- Como 20/05 > 15/04, o prazo do 1º trimestre já encerrou; o sistema considera o 2º trimestre/2025 (data limite 15/07/2025).

---

## 5. Resumo: uso dos campos por periodicidade

| Periodicidade | Dia limite | Mês limite |
|---------------|------------|------------|
| **Mensal**    | Dia do mês em que termina o prazo (mês = mês da data de cálculo). | Não utilizado. |
| **Semestral** | Dia do mês em que termina o prazo (mês = 1º mês do semestre seguinte ao período). | Não utilizado. |
| **Anual**     | Dia do mês em que termina o prazo. | Mês (1–12) em que termina o prazo, no ano seguinte ao período de referência. Se inválido, usa janeiro. |
| **Trimestral**| Dia do mês em que termina o prazo (mês = 1º mês do trimestre seguinte ao período). | Não utilizado. |

---

## 6. Regra do dia quando é “final de mês”

Em qualquer periodicidade, quando o **Dia limite** está configurado como 28, 29, 30 ou 31, o sistema interpreta como “até o último dia do mês” e ajusta para o último dia real daquele mês (28, 29, 30 ou 31, conforme o mês e o ano).

---

## 7. Referência técnica

As regras descritas neste documento estão implementadas no sistema principalmente em:

- **QuestionarioService**: métodos `getPeriodoReferencia`, `calcularDataLimitePreenchimento`, `calcularMesLimitePreenchimento`, `calcularDiaLimitePreenchimento` e `getPeriodoReferenciaDadoMesAnoResposta`.
- Cadastro do questionário: campos **NUM_DIA_LIMITE** (Dia limite) e **NUM_MES_LIMITE** / **NUM_MES_REFERENCIA** (Mês limite).

Versão deste documento: 1.0 (com base no código em fev/2025).
