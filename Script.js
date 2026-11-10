/* Botões de acessibilidade e o teste.
   Para mudar os textos, edite o index.html. */

var MINIMO = 16;
var MAXIMO = 26;
var leituraId = 0;

function pegar(id) {
    return document.getElementById(id);
}

function guardar(chave, valor) {
    try {
        localStorage.setItem(chave, valor);
    } catch (erro) {
        /* alguns navegadores bloqueiam o armazenamento */
    }
}

function lerGuardado(chave) {
    try {
        return localStorage.getItem(chave);
    } catch (erro) {
        return null;
    }
}

function avisar(texto) {
    var el = pegar("status");
    if (el) el.textContent = texto;
}

function aplicarTamanho(px, anunciar) {
    var pagina = pegar("pagina");
    if (!pagina) return;
    pagina.style.fontSize = px + "px";
    guardar("sd-tamanho", String(px));
    var diminuir = pegar("diminuir");
    var aumentar = pegar("aumentar");
    if (diminuir) diminuir.disabled = px <= MINIMO;
    if (aumentar) aumentar.disabled = px >= MAXIMO;
    if (anunciar) avisar("Letra " + px + "px.");
}

function aplicarContraste(ativo, anunciar) {
    var pagina = pegar("pagina");
    if (!pagina) return;
    pagina.classList.toggle("contraste", ativo);
    var botao = pegar("contraste");
    if (botao) botao.setAttribute("aria-pressed", ativo ? "true" : "false");
    guardar("sd-contraste", ativo ? "1" : "0");
    if (anunciar) avisar(ativo ? "Alto contraste ligado." : "Alto contraste desligado.");
}

function pararLeitura() {
    leituraId += 1;
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    var botao = pegar("ouvir");
    if (botao) {
        botao.textContent = "Ouvir";
        botao.setAttribute("aria-pressed", "false");
    }
}

function fatiar(texto) {
    var blocos = [];
    var resto = texto;
    while (resto.length > 220) {
        var corte = resto.lastIndexOf(" ", 220);
        if (corte < 80) corte = 220;
        blocos.push(resto.slice(0, corte).trim());
        resto = resto.slice(corte).trim();
    }
    if (resto) blocos.push(resto);
    return blocos.length ? blocos : [texto];
}

function textoDaPagina() {
    var leitura = pegar("leitura");
    var base = leitura ? leitura.textContent.replace(/\s+/g, " ").trim() : "";
    var resultado = pegar("resultado");
    if (resultado && !resultado.hidden && resultado.textContent.trim()) {
        return (base + " " + resultado.textContent).replace(/\s+/g, " ").trim();
    }
    var visivel = document.querySelector("#quiz .pergunta:not([hidden])");
    var extra = visivel ? visivel.innerText.replace(/\s+/g, " ").trim() : "";
    return (base + " " + extra).replace(/\s+/g, " ").trim();
}

function comecarLeitura() {
    if (!window.speechSynthesis) {
        avisar("Este navegador não lê em voz alta. Tente Chrome ou Edge.");
        return;
    }
    var texto = textoDaPagina();
    if (!texto) {
        avisar("Não há texto para ler.");
        return;
    }
    var id = ++leituraId;
    var botao = pegar("ouvir");
    window.speechSynthesis.cancel();
    window.speechSynthesis.resume();
    if (botao) {
        botao.textContent = "Parar";
        botao.setAttribute("aria-pressed", "true");
    }
    avisar("Lendo o texto em voz alta.");
    fatiar(texto).forEach(function (parte, i, lista) {
        var fala = new SpeechSynthesisUtterance(parte);
        fala.lang = "pt-BR";
        fala.onend = function () {
            if (id !== leituraId || i !== lista.length - 1) return;
            if (botao) {
                botao.textContent = "Ouvir";
                botao.setAttribute("aria-pressed", "false");
            }
        };
        fala.onerror = function () {
            if (id !== leituraId) return;
            leituraId += 1;
            window.speechSynthesis.cancel();
            if (botao) {
                botao.textContent = "Ouvir";
                botao.setAttribute("aria-pressed", "false");
            }
        };
        window.speechSynthesis.speak(fala);
    });
}

function mensagemFinal(pontos, total) {
    if (pontos === total) {
        return pontos + " de " + total + ". Você reconheceu as escolhas mais seguras.";
    }
    if (pontos === total - 1) {
        return pontos + " de " + total + ". Quase lá. Releia a dica da pergunta que gerou dúvida.";
    }
    return pontos + " de " + total + ". Vale reler as dicas com calma.";
}

function iniciarQuiz(signal) {
    var quiz = pegar("quiz");
    if (!quiz) return;
    var perguntas = Array.prototype.slice.call(quiz.querySelectorAll(".pergunta"));
    var passo = pegar("quiz-passo");
    var feedback = pegar("feedback");
    var seguir = pegar("seguir");
    var resultado = pegar("resultado");
    var reiniciar = pegar("reiniciar");
    var indice = 0;
    var acertos = 0;
    var respondida = false;

    function mostrar(i) {
        perguntas.forEach(function (el, n) {
            el.hidden = n !== i;
            Array.prototype.forEach.call(el.querySelectorAll(".opcao"), function (b) {
                b.classList.remove("certa", "errada");
                b.disabled = false;
            });
        });
        if (passo) {
            passo.hidden = false;
            passo.textContent = "Pergunta " + (i + 1) + " de " + perguntas.length;
        }
        if (feedback) feedback.textContent = "";
        if (seguir) seguir.hidden = true;
        if (resultado) {
            resultado.hidden = true;
            resultado.textContent = "";
        }
        if (reiniciar) reiniciar.hidden = true;
        respondida = false;
    }

    quiz.addEventListener("click", function (ev) {
        var alvo = ev.target.closest("button");
        if (!alvo) return;
        if (alvo.id === "reiniciar") {
            indice = 0;
            acertos = 0;
            mostrar(0);
            avisar("Teste recomeçado.");
            return;
        }
        if (alvo.id === "seguir") {
            if (indice >= perguntas.length - 1) {
                perguntas.forEach(function (el) { el.hidden = true; });
                if (passo) passo.hidden = true;
                if (feedback) feedback.textContent = "";
                if (seguir) seguir.hidden = true;
                var texto = mensagemFinal(acertos, perguntas.length);
                if (resultado) {
                    resultado.hidden = false;
                    resultado.textContent = texto;
                }
                if (reiniciar) reiniciar.hidden = false;
                avisar(texto);
                return;
            }
            indice += 1;
            mostrar(indice);
            return;
        }
        if (!alvo.classList.contains("opcao") || respondida) return;
        var caixa = alvo.closest(".pergunta");
        if (!caixa) return;
        var botoes = Array.prototype.slice.call(caixa.querySelectorAll(".opcao"));
        var escolha = botoes.indexOf(alvo);
        var certa = Number(caixa.getAttribute("data-certa"));
        respondida = true;
        botoes.forEach(function (b, n) {
            if (n === certa) b.classList.add("certa");
            if (n === escolha && n !== certa) b.classList.add("errada");
            b.disabled = true;
        });
        if (escolha === certa) acertos += 1;
        var textoCerto = botoes[certa] ? botoes[certa].textContent.trim() : "";
        if (feedback) {
            feedback.textContent = escolha === certa
                ? "Certo. Essa é a escolha mais segura."
                : "Ainda não. A escolha mais segura é: " + textoCerto;
        }
        if (seguir) {
            seguir.hidden = false;
            seguir.textContent = indice >= perguntas.length - 1 ? "Ver resultado" : "Próxima pergunta";
        }
    }, { signal: signal });

    mostrar(0);
}

function escutar(id, fn, signal) {
    var el = pegar(id);
    if (el) el.addEventListener("click", fn, { signal: signal });
}

function iniciarSeguranca() {
    var pagina = pegar("pagina");
    if (!pagina || pagina.getAttribute("data-ligado") === "1") return function () { };
    pagina.setAttribute("data-ligado", "1");

    var controle = new AbortController();
    var signal = controle.signal;
    var guardado = Number(lerGuardado("sd-tamanho"));
    var tamanho = guardado >= MINIMO && guardado <= MAXIMO ? guardado : 18;

    aplicarTamanho(tamanho, false);
    aplicarContraste(lerGuardado("sd-contraste") === "1", false);
    avisar("Letra " + tamanho + "px.");

    escutar("diminuir", function () {
        if (tamanho <= MINIMO) {
            avisar("Letra já está no mínimo.");
            return;
        }
        tamanho -= 2;
        aplicarTamanho(tamanho, true);
    }, signal);

    escutar("aumentar", function () {
        if (tamanho >= MAXIMO) {
            avisar("Letra já está no máximo.");
            return;
        }
        tamanho += 2;
        aplicarTamanho(tamanho, true);
    }, signal);

    escutar("ouvir", function () {
        var botao = pegar("ouvir");
        if (botao && botao.getAttribute("aria-pressed") === "true") {
            pararLeitura();
            avisar("Leitura interrompida.");
            return;
        }
        comecarLeitura();
    }, signal);

    escutar("contraste", function () {
        aplicarContraste(!pagina.classList.contains("contraste"), true);
    }, signal);

    iniciarQuiz(signal);

    return function parar() {
        controle.abort();
        pararLeitura();
        pagina.removeAttribute("data-ligado");
    };
}

document.addEventListener("DOMContentLoaded", iniciarSeguranca);